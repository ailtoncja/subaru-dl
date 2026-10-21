// Envia o cookies.txt para o Subaru DL do celular, pela rede local.
//
// O celular escuta numa porta enquanto a tela "Receber do PC" está aberta e mostra um código de 16 letras
// (o app antigo mostrava 8). Aqui o PC acha o celular na rede (GET /subaru), cifra os cookies com AES-256-GCM
// usando uma chave derivada desse código (PBKDF2 com o "sal" que o celular informou) e manda (POST /cookies).
// O mesmo cálculo está em CookieReceiver.kt, no app do celular. Sem o código certo, nada é aceito; os cookies
// nunca viajam em texto puro, só vão para endereços da rede local e só os dos sites de vídeo e imagem.
import { createCipheriv, pbkdf2, randomBytes } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { request } from 'node:http'
import { isIP } from 'node:net'
import { networkInterfaces } from 'node:os'
import { promisify } from 'node:util'
import type { CelularEncontrado, ResultadoEnvioCelular } from '@shared/tipos'
import * as cfg from './configuracoes'
import { arquivoCookies, existemCookiesDoPrograma, exportarCookies, lerCookiesEmUso, soSitesDeVideo } from './cookies'
import { logar } from './logs'

const PORTA = 38475
const deriva = promisify(pbkdf2)
/** O mesmo número do celular; um "celular" que pede menos está tentando facilitar a quebra do código. */
const ITERACOES = 120_000

interface Resposta {
  status: number
  json: Record<string, unknown> | null
}

function pedir(ip: string, porta: number, metodo: 'GET' | 'POST', caminho: string, corpo: string | null, timeout: number): Promise<Resposta> {
  return new Promise((resolve, reject) => {
    const headers = corpo ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) } : {}
    const req = request({ host: ip, port: porta, method: metodo, path: caminho, timeout, agent: false, headers }, (res) => {
      const partes: Buffer[] = []
      res.on('data', (d: Buffer) => partes.push(d))
      res.on('end', () => {
        let json: Record<string, unknown> | null = null
        try {
          json = JSON.parse(Buffer.concat(partes).toString('utf8')) as Record<string, unknown>
        } catch {
          /* resposta que não é do Subaru DL */
        }
        resolve({ status: res.statusCode ?? 0, json })
      })
    })
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')))
    req.on('error', reject)
    req.end(corpo ?? undefined)
  })
}

const ehPrivado = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)
/** Rede local, o próprio PC (adb forward) ou link-local: os únicos lugares para onde os cookies podem ir. */
const ehLocal = (ip: string) => isIP(ip) === 4 && (ehPrivado(ip) || /^(127\.|169\.254\.)/.test(ip))

/** Endereços a testar: os 254 vizinhos de cada rede local do PC, mais o próprio PC (útil com `adb forward`). */
function candidatos(): string[] {
  const redes = new Set<string>()
  const proprios = new Set<string>()
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family !== 'IPv4' || i.internal || !ehPrivado(i.address)) continue
      proprios.add(i.address)
      redes.add(i.address.split('.').slice(0, 3).join('.'))
    }
  }
  const ips: string[] = []
  for (const rede of [...redes].slice(0, 6)) {
    for (let n = 1; n < 255; n++) {
      const ip = `${rede}.${n}`
      if (!proprios.has(ip)) ips.push(ip)
    }
  }
  ips.push('127.0.0.1')
  return ips
}

export async function procurarCelulares(): Promise<CelularEncontrado[]> {
  const ips = candidatos()
  const achados: CelularEncontrado[] = []
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < ips.length) {
      const ip = ips[proximo++]
      try {
        const r = await pedir(ip, PORTA, 'GET', '/subaru', null, 700)
        if (r.status === 200 && r.json?.app === 'subaru-dl') achados.push({ ip, porta: PORTA, nome: String(r.json.nome ?? 'Celular') })
      } catch {
        /* ninguém escutando nesse endereço */
      }
    }
  }
  await Promise.all(Array.from({ length: 48 }, trabalhador))
  logar('info', `Procura de celulares: ${achados.length} encontrado(s)`)
  return achados
}

/** "192.168.0.20", "192.168.0.20:38475" ou "http://192.168.0.20:38475/" */
function lerEndereco(texto: string): { ip: string; porta: number } | null {
  const m = texto.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').match(/^([\w.-]+)(?::(\d{1,5}))?$/)
  if (!m) return null
  const porta = m[2] ? Number(m[2]) : PORTA
  return porta > 0 && porta < 65536 ? { ip: m[1], porta } : null
}

const falha = (erro: string): ResultadoEnvioCelular => ({ ok: false, cookies: 0, sites: 0, erro })

/** O que vai para o celular: os cookies em uso (ou, sem nenhum, gerados do navegador), só dos sites de vídeo e imagem. */
async function textoParaEnviar(): Promise<{ texto: string } | { erro: string }> {
  const c = cfg.configuracoes().cookies
  let texto: string | null = null
  if (c.origem === 'arquivo' && c.arquivo) texto = lerCookiesEmUso(c.arquivo)
  if (texto == null && existemCookiesDoPrograma()) texto = lerCookiesEmUso(arquivoCookies())
  if (texto == null) {
    const r = await exportarCookies(c.navegador, c.perfil, true)
    if (!r.ok) return { erro: r.erro ?? 'Não consegui gerar o cookies.txt.' }
    texto = lerCookiesEmUso(arquivoCookies())
  }
  return texto == null ? { erro: 'Não consegui ler os cookies.' } : { texto: soSitesDeVideo(texto) }
}

/** O endereço digitado tem que ser da rede local (um nome é resolvido antes de conferir). */
async function enderecoLocal(alvo: { ip: string; porta: number }): Promise<{ ip: string; porta: number } | null> {
  let ip = alvo.ip
  if (!isIP(ip)) {
    try {
      ip = (await lookup(ip, { family: 4 })).address
    } catch {
      return null
    }
  }
  return ehLocal(ip) ? { ip, porta: alvo.porta } : null
}

export async function enviarCookiesAoCelular(endereco: string, codigoDigitado: string): Promise<ResultadoEnvioCelular> {
  const lido = lerEndereco(endereco)
  if (!lido) return falha('Endereço do celular inválido. Use algo como 192.168.0.20.')
  const alvo = await enderecoLocal(lido)
  if (!alvo) return falha('Os cookies só vão para um celular na mesma rede Wi-Fi (endereços como 192.168.x.x ou 10.x.x.x).')
  const codigo = codigoDigitado.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (codigo.length === 8) return falha('Esse código é de uma versão antiga do app do celular, mais fácil de quebrar. Atualize o Subaru DL no celular (Ajustes → Sobre → Verificar) e abra "Receber do PC" de novo.')
  if (codigo.length !== 16) return falha('O código tem 16 letras e números (aparece na tela do celular).')

  const origem = await textoParaEnviar()
  if ('erro' in origem) return falha(origem.erro)
  const texto = origem.texto
  if (!texto.split(/\r?\n/).some((l) => l.trim() && !l.startsWith('# ') && l.split('\t').length >= 7)) {
    return falha('Não há cookies de sites de vídeo para enviar. Entre nas suas contas no navegador e gere de novo.')
  }

  const naoAchei = `Não consegui falar com o celular em ${alvo.ip}. Confira se a tela "Receber do PC" está aberta no celular e se os dois estão no mesmo Wi-Fi.`
  try {
    const info = await pedir(alvo.ip, alvo.porta, 'GET', '/subaru', null, 4000)
    if (info.status !== 200 || info.json?.app !== 'subaru-dl' || typeof info.json.sal !== 'string') return falha('Esse endereço não é um Subaru DL no modo "Receber do PC".')
    const iteracoes = Number(info.json.iteracoes) || ITERACOES
    const sal = Buffer.from(info.json.sal, 'base64')
    // O PC decide o mínimo: um aparelho que pede menos voltas ou um sal curto não recebe nada
    if (iteracoes < ITERACOES || iteracoes > 1_000_000 || sal.length < 16) return falha('Esse aparelho não parece um Subaru DL de verdade. Nada foi enviado.')
    const chave = await deriva(Buffer.from(codigo, 'utf8'), sal, iteracoes, 32, 'sha256')

    const iv = randomBytes(12)
    const cifra = createCipheriv('aes-256-gcm', chave, iv)
    const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final(), cifra.getAuthTag()])
    const corpo = JSON.stringify({ iv: iv.toString('base64'), dados: dados.toString('base64') })

    const r = await pedir(alvo.ip, alvo.porta, 'POST', '/cookies', corpo, 15_000)
    if (r.status === 200 && r.json?.ok) {
      const cookies = Number(r.json.cookies) || 0
      const sites = Number(r.json.sites) || 0
      logar('info', `Cookies enviados ao celular (${cookies} cookies de ${sites} sites)`)
      return { ok: true, cookies, sites, erro: null }
    }
    if (r.status === 403) return falha('Código incorreto. Confira o código que aparece no celular.')
    if (r.status === 429) return falha('O celular fechou o recebimento por causa de tentativas erradas. Abra a tela de novo no celular para gerar outro código.')
    if (r.status === 413) return falha('O cookies.txt é grande demais para enviar. Gere de novo marcando "só os sites de vídeo".')
    return falha('O celular recusou os cookies.')
  } catch (e) {
    logar('erro', `Envio de cookies ao celular: ${e instanceof Error ? e.message : String(e)}`)
    return falha(naoAchei)
  }
}
