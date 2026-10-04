// Baixa as ferramentas que vão embutidas no instalador para resources/bin.
// Uso: npm run binarios            (só baixa o que estiver faltando)
//      npm run binarios -- --forcar (baixa tudo de novo)
import { execFileSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const BIN = resolve('resources/bin')
const TMP = resolve('resources/.tmp')
const forcar = process.argv.includes('--forcar')

async function baixar(url, destino) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'subaru-dl' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`)
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(destino))
}

async function ultimoAsset(repo, padrao) {
  const resp = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { 'User-Agent': 'subaru-dl', Accept: 'application/vnd.github+json' }
  })
  if (!resp.ok) throw new Error(`GitHub API ${resp.status} para ${repo}`)
  const release = await resp.json()
  const asset = release.assets.find((a) => padrao.test(a.name))
  if (!asset) throw new Error(`Nenhum arquivo de ${repo} bate com ${padrao}`)
  return asset.browser_download_url
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
    url: async () => 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  },
  {
    nome: 'Deno',
    arquivos: ['deno.exe'],
    zip: true,
    url: async () => 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip'
  },
  {
    nome: 'ffmpeg + ffprobe',
    arquivos: ['ffmpeg.exe', 'ffprobe.exe'],
    zip: true,
    url: async () =>
      'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  },
  {
    nome: 'gallery-dl',
    arquivos: ['gallery-dl.exe'],
    // O gallery-dl publica os executáveis em um repositório separado.
    url: () => ultimoAsset('gdl-org/builds', /^gallery-dl_windows\.exe$/)
  },
  {
    nome: 'aria2',
    arquivos: ['aria2c.exe'],
    zip: true,
    url: () => ultimoAsset('aria2/aria2', /win-64bit.*\.zip$/)
  }
]

mkdirSync(BIN, { recursive: true })
mkdirSync(TMP, { recursive: true })

for (const f of ferramentas) {
  if (!forcar && f.arquivos.every((a) => existsSync(join(BIN, a)))) {
    console.log(`✓ ${f.nome} já está em resources/bin`)
    continue
  }
  const url = await f.url()
  console.log(`↓ ${f.nome}: ${url}`)
  if (f.zip) {
    const zip = join(TMP, 'download.zip')
    await baixar(url, zip)
    extrairDoZip(zip, f.arquivos)
  } else {
    await baixar(url, join(BIN, f.arquivos[0]))
  }
  console.log(`✓ ${f.nome} pronto`)
}

rmSync(TMP, { recursive: true, force: true })
console.log('\nTodas as ferramentas estão em resources/bin')
