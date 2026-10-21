// Publica uma versão nova no GitHub (Releases), que alimenta a atualização automática do programa.
// Sobe tudo como rascunho e só publica no fim: subir direto como versão publicada faz os envios em paralelo
// brigarem para criar a mesma versão, e um dos arquivos fica de fora.
// Uso: suba a versão no package.json, faça o commit e o push, e rode `npm run publicar`.
// Precisa do GitHub CLI (gh) logado ou da variável GH_TOKEN.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const rodar = (comando) => execSync(comando, { stdio: 'inherit', env: process.env })

if (!process.env.GH_TOKEN) process.env.GH_TOKEN = execSync('gh auth token').toString().trim()

rodar('npm run binarios')
rodar('npx electron-vite build')
// O rascunho já existe antes dos envios: sem isso cada envio paralelo cria a sua versão e os arquivos se dividem
// em duas (aconteceu na 0.8.1)
rodar(`gh release create v${version} --repo ailtoncja/subaru-dl --draft --title ${version} --target main --notes ""`)
rodar('npx electron-builder --win --publish always')
rodar(`gh release edit v${version} --repo ailtoncja/subaru-dl --draft=false --latest`)
console.log(`\nVersão ${version} publicada: https://github.com/ailtoncja/subaru-dl/releases/tag/v${version}`)
