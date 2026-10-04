// Exportação de dados de playlists, canais, buscas e listas de links (item 73).
import { writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { crc32, deflateRawSync } from 'node:zlib'
import type { CampoDados, Configuracoes, FonteDados, FormatoExportacao, LinhaDados, Segredos } from '@shared/tipos'
import { CAMPOS_DADOS, detectarFonte, valorCampo } from '@shared/dados'
import { executar, executarAteFim } from './ferramentas'
import { logar } from './logs'
import { argsRede, comandoParaLog, ErroYtdlp, nomeSite } from './ytdlp'

/* eslint-disable @typescript-eslint/no-explicit-any */
function linhaDe(e: any): LinhaDados {
  const id = String(e.id ?? '')
  const ehYoutube = /youtube/i.test(e.ie_key ?? e.extractor_key ?? '') || /youtu\.?be/.test(e.url ?? e.webpage_url ?? '')
  const url = e.webpage_url ?? (e.url?.startsWith('http') ? e.url : ehYoutube && id ? `https://www.youtube.com/watch?v=${id}` : (e.url ?? ''))
  return {
    id,
    url,
    titulo: e.title ?? id,
    canal: e.channel ?? e.uploader ?? null,
    site: nomeSite(e.extractor_key ?? e.ie_key ?? ''),
    duracao: e.duration ?? null,
    dataUpload: e.upload_date ?? (e.timestamp ? new Date(e.timestamp * 1000).toISOString().slice(0, 10).replaceAll('-', '') : null),
    views: e.view_count ?? null,
    likes: e.like_count ?? null,
    comentarios: e.comment_count ?? null,
    descricao: e.description ?? null,
    tags: Array.isArray(e.tags) ? e.tags : [],
    miniatura: e.thumbnail ?? e.thumbnails?.[e.thumbnails.length - 1]?.url ?? null
  }
}

/** Abre playlists aninhadas (ex.: a página de um canal tem as abas Vídeos, Shorts, Ao vivo). */
function achatar(d: any): any[] {
  if (!Array.isArray(d.entries)) return [d]
  return d.entries.filter(Boolean).flatMap((e: any) => (Array.isArray(e.entries) ? achatar(e) : [e]))
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function urlDaFonte(fonte: FonteDados, entrada: string): string {
  const t = entrada.trim()
  if (fonte === 'busca') return `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`
  // Canal do YouTube sem aba: usa a aba de vídeos (senão vêm as abas como "itens")
  if ((fonte === 'canal' || fonte === 'auto') && /youtube\.com\/(@[^/?#]+|channel\/[^/?#]+|c\/[^/?#]+|user\/[^/?#]+)\/?$/i.test(t)) {
    return t.replace(/\/?$/, '/videos')
  }
  return t
}

export async function lerDados(
  fonte: FonteDados,
  entrada: string,
  limite: number,
  detalhado: boolean,
  c: Configuracoes,
  s: Segredos,
  aoProgredir: (lidos: number) => void
): Promise<LinhaDados[]> {
  const real = fonte === 'auto' ? detectarFonte(entrada) : fonte
  const urls = real === 'links' ? entrada.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)) : [urlDaFonte(real, entrada)]
  if (!urls.length) throw new ErroYtdlp('Nenhum link válido')

  const linhas: LinhaDados[] = []
  for (const url of urls) {
    const base = ['--color', 'never', '--no-warnings', ...(limite > 0 ? ['-I', `:${limite}`] : []), ...argsRede(c, s, url)]
    if (detalhado) {
      // Uma linha JSON por vídeo, com todos os dados (lento: abre cada vídeo)
      const args = [...base, '-j', '--skip-download', '--', url]
      logar('comando', comandoParaLog(args))
      await new Promise<void>((resolve, reject) => {
        const proc = executar('yt-dlp.exe', args)
        let erro = ''
        createInterface({ input: proc.stdout! }).on('line', (l) => {
          try {
            linhas.push(linhaDe(JSON.parse(l)))
            aoProgredir(linhas.length)
          } catch {
            /* linha que não é JSON */
          }
        })
        createInterface({ input: proc.stderr! }).on('line', (l) => {
          if (l.startsWith('ERROR')) {
            erro = l.replace(/^ERROR:\s*/, '')
            logar('erro', l)
          }
        })
        proc.on('close', (codigo) => (codigo === 0 || linhas.length ? resolve() : reject(new ErroYtdlp(erro || `yt-dlp terminou com o código ${codigo}`))))
        proc.on('error', reject)
      })
    } else {
      const args = [...base, '-J', '--flat-playlist', '--', url]
      logar('comando', comandoParaLog(args))
      const r = await executarAteFim('yt-dlp.exe', args, 300_000)
      if (r.codigo !== 0 || !r.stdout.trim()) {
        const erro = r.stderr.split(/\r?\n/).filter((l) => l.startsWith('ERROR')).pop() ?? 'Falha ao ler o link'
        if (urls.length === 1) throw new ErroYtdlp(erro.replace(/^ERROR:\s*/, ''))
        logar('erro', `${url}: ${erro}`)
        continue
      }
      const d = JSON.parse(r.stdout)
      // Em canais, o nome do canal só vem no topo da lista
      const herdado = { extractor_key: d.extractor_key, channel: d.channel ?? d.uploader }
      for (const e of achatar(d)) linhas.push(linhaDe({ ...herdado, ...e, channel: e.channel ?? e.uploader ?? herdado.channel }))
      aoProgredir(linhas.length)
    }
  }
  logar('info', `Dados lidos: ${linhas.length} itens`)
  return linhas
}

// ---------- Exportar ----------

function escaparXml(t: string): string {
  return t.replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]!).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}

function csv(linhas: LinhaDados[], campos: CampoDados[]): string {
  const celula = (v: string | number) => {
    const t = String(v)
    return /[";\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
  }
  // ";" e BOM para o Excel em português abrir com acentos e colunas certas
  const cab = campos.map((c) => CAMPOS_DADOS[c].nome).join(';')
  return '﻿' + [cab, ...linhas.map((l) => campos.map((c) => celula(valorCampo(l, c))).join(';'))].join('\r\n')
}

function markdown(linhas: LinhaDados[], campos: CampoDados[]): string {
  const celula = (v: string | number) => String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
  return [
    `| ${campos.map((c) => CAMPOS_DADOS[c].nome).join(' | ')} |`,
    `| ${campos.map(() => '---').join(' | ')} |`,
    ...linhas.map((l) => `| ${campos.map((c) => celula(valorCampo(l, c))).join(' | ')} |`)
  ].join('\n')
}

function html(linhas: LinhaDados[], campos: CampoDados[]): string {
  const celula = (l: LinhaDados, c: CampoDados) => {
    const v = escaparXml(String(valorCampo(l, c)))
    if ((c === 'url' || c === 'miniatura') && v) return `<a href="${v}">${c === 'miniatura' ? `<img src="${v}" width="160">` : v}</a>`
    return v
  }
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Subaru DL — dados exportados</title>
<style>body{font:14px system-ui;background:#0c1430;color:#ececf3;padding:20px}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #22346e;padding:6px 8px;text-align:left;vertical-align:top}th{background:#13204a;color:#ffd200}a{color:#7aa2ff}</style></head>
<body><h1>${linhas.length} itens</h1><table><thead><tr>${campos.map((c) => `<th>${CAMPOS_DADOS[c].nome}</th>`).join('')}</tr></thead><tbody>
${linhas.map((l) => `<tr>${campos.map((c) => `<td>${celula(l, c)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></body></html>`
}

/** .xlsx de verdade: um zip com as planilhas em XML. */
function xlsx(linhas: LinhaDados[], campos: CampoDados[]): Buffer {
  const coluna = (n: number) => {
    let s = ''
    for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
    return s
  }
  const celula = (v: string | number, ref: string) =>
    typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(v)}</t></is></c>`
  const cab = `<row r="1">${campos.map((c, i) => celula(CAMPOS_DADOS[c].nome, `${coluna(i)}1`).replace('<c ', '<c s="1" ')).join('')}</row>`
  const corpo = linhas
    .map((l, r) => `<row r="${r + 2}">${campos.map((c, i) => celula(valorCampo(l, c, true), `${coluna(i)}${r + 2}`)).join('')}</row>`)
    .join('')
  const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${cab}${corpo}</sheetData></worksheet>`

  const arquivos: Array<[string, string]> = [
    [
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>`
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    ],
    [
      'xl/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`
    ],
    ['xl/worksheets/sheet1.xml', planilha]
  ]
  return zip(arquivos.map(([nome, conteudo]) => [nome, Buffer.from(conteudo, 'utf8')]))
}

/** Zip mínimo (deflate), suficiente para o .xlsx. */
function zip(arquivos: Array<[string, Buffer]>): Buffer {
  const locais: Buffer[] = []
  const centrais: Buffer[] = []
  let offset = 0
  for (const [nome, dados] of arquivos) {
    const nomeBuf = Buffer.from(nome, 'utf8')
    const comprimido = deflateRawSync(dados)
    const crc = crc32(dados)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // nomes em UTF-8
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comprimido.length, 18)
    local.writeUInt32LE(dados.length, 22)
    local.writeUInt16LE(nomeBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comprimido.length, 20)
    central.writeUInt32LE(dados.length, 24)
    central.writeUInt16LE(nomeBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locais.push(local, nomeBuf, comprimido)
    centrais.push(central, nomeBuf)
    offset += local.length + nomeBuf.length + comprimido.length
  }
  const tamanhoCentral = centrais.reduce((t, b) => t + b.length, 0)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(tamanhoCentral, 12)
  fim.writeUInt32LE(offset, 16)
  return Buffer.concat([...locais, ...centrais, fim])
}

export function gerarExportacao(linhas: LinhaDados[], campos: CampoDados[], formato: FormatoExportacao): Buffer | string {
  switch (formato) {
    case 'csv':
      return csv(linhas, campos)
    case 'xlsx':
      return xlsx(linhas, campos)
    case 'json':
      return JSON.stringify(
        linhas.map((l) => Object.fromEntries(campos.map((c) => [c, valorCampo(l, c, true)]))),
        null,
        2
      )
    case 'md':
      return markdown(linhas, campos)
    case 'html':
      return html(linhas, campos)
    case 'txt':
      return linhas.map((l) => l.url).join('\r\n')
  }
}

export function salvarExportacao(caminho: string, conteudo: Buffer | string): void {
  writeFileSync(caminho, conteudo)
}
