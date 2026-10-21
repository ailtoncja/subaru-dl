// Baixa as ferramentas que vão embutidas no instalador para resources/bin.
// Uso: npm run binarios            (só baixa o que estiver faltando)
//      npm run binarios -- --forcar (baixa tudo de novo)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const BIN = resolve('resources/bin')
const TMP = resolve('resources/.tmp')
const forcar = process.argv.includes('--forcar')

// Cada arquivo é conferido pela soma SHA-256 publicada antes de entrar no instalador.
async function baixar({ url, sha256 }, destino) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'subaru-dl' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`)
  const hash = createHash('sha256')
  const contar = new Transform({
    transform(pedaco, _cod, pronto) {
      hash.update(pedaco)
      pronto(null, pedaco)
    }
  })
  await pipeline(Readable.fromWeb(resp.body), contar, createWriteStream(destino))
  const obtido = hash.digest('hex')
  if (obtido !== sha256) {
    rmSync(destino, { force: true })
    throw new Error(`Soma SHA-256 não confere em ${url}: esperado ${sha256}, veio ${obtido}`)
  }
}

/** Um arquivo da versão do GitHub, com a soma que o GitHub calculou ao publicar. */
async function asset(repo, padrao, versao = 'latest') {
  const caminho = versao === 'latest' ? 'releases/latest' : `releases/tags/${versao}`
  const resp = await fetch(`https://api.github.com/repos/${repo}/${caminho}`, {
    headers: { 'User-Agent': 'subaru-dl', Accept: 'application/vnd.github+json' }
  })
  if (!resp.ok) throw new Error(`GitHub API ${resp.status} para ${repo}`)
  const release = await resp.json()
  const achado = release.assets.find((a) => padrao.test(a.name))
  if (!achado) throw new Error(`Nenhum arquivo de ${repo} bate com ${padrao}`)
  const sha256 = achado.digest?.match(/^sha256:([0-9a-f]{64})$/i)?.[1]?.toLowerCase()
  if (!sha256) throw new Error(`${repo} não tem soma SHA-256 para ${achado.name}`)
  return { url: achado.browser_download_url, sha256 }
}

// Extrai o zip e move para BIN os arquivos pedidos, onde quer que estejam dentro dele.
function extrairDoZip(zip, nomes) {
  const pasta = join(TMP, 'zip')
  rmSync(pasta, { recursive: true, force: true })
  mkdirSync(pasta, { recursive: true })
  // O tar do Windows (bsdtar) abre .zip; o do Git Bash não.
  const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
  execFileSync(tar, ['-xf', zip, '-C', pasta])
  const achar = (dir, nome) => {
    for (const item of readdirSync(dir)) {
      const caminho = join(dir, item)
      if (statSync(caminho).isDirectory()) {
        const achado = achar(caminho, nome)
        if (achado) return achado
      } else if (item.toLowerCase() === nome) return caminho
    }
    return null
  }
  for (const nome of nomes) {
    const origem = achar(pasta, nome)
    if (!origem) throw new Error(`${nome} não encontrado dentro de ${zip}`)
    rmSync(join(BIN, nome), { force: true })
    renameSync(origem, join(BIN, nome))
  }
}

const ferramentas = [
  {
    nome: 'yt-dlp',
    arquivos: ['yt-dlp.exe'],
    url: () => asset('yt-dlp/yt-dlp', /^yt-dlp\.exe$/)
  },
  {
    nome: 'Deno',
    arquivos: ['deno.exe'],
    zip: true,
    url: () => asset('denoland/deno', /^deno-x86_64-pc-windows-msvc\.zip$/)
  },
  {
    nome: 'ffmpeg + ffprobe',
    arquivos: ['ffmpeg.exe', 'ffprobe.exe'],
    zip: true,
    url: () => asset('yt-dlp/FFmpeg-Builds', /^ffmpeg-master-latest-win64-gpl\.zip$/, 'latest')
  },
  {
    nome: 'gallery-dl',
    arquivos: ['gallery-dl.exe'],
    // O gallery-dl publica os executáveis em um repositório separado.
    url: () => asset('gdl-org/builds', /^gallery-dl_windows\.exe$/)
  },
  {
    nome: 'aria2',
    arquivos: ['aria2c.exe'],
    zip: true,
    // Sem versões novas desde 2023 e sem soma publicada: fixada (a mesma de src/main/ferramentas.ts)
    url: async () => ({
      url: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip',
      sha256: '67d015301eef0b612191212d564c5bb0a14b5b9c4796b76454276a4d28d9b288'
    })
  }
]

mkdirSync(BIN, { recursive: true })
mkdirSync(TMP, { recursive: true })

for (const f of ferramentas) {
  if (!forcar && f.arquivos.every((a) => existsSync(join(BIN, a)))) {
    console.log(`✓ ${f.nome} já está em resources/bin`)
    continue
  }
  const fonte = await f.url()
  console.log(`↓ ${f.nome}: ${fonte.url}`)
  if (f.zip) {
    const zip = join(TMP, 'download.zip')
    await baixar(fonte, zip)
    extrairDoZip(zip, f.arquivos)
  } else {
    await baixar(fonte, join(BIN, f.arquivos[0]))
  }
  console.log(`✓ ${f.nome} pronto`)
}

rmSync(TMP, { recursive: true, force: true })
console.log('\nTodas as ferramentas estão em resources/bin')
