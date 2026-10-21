// Publica uma versão nova no GitHub (Releases), que alimenta a atualização automática do programa.
// Sobe tudo como rascunho e só publica no fim: subir direto como versão publicada faz os envios em paralelo
// brigarem para criar a mesma versão, e um dos arquivos fica de fora.
// Uso: suba a versão no package.json, faça o commit e o push, e rode `npm run publicar`.
// Precisa do GitHub CLI (gh) logado e da chave de assinatura das versões (veja CHAVE abaixo).
import { execFileSync } from 'node:child_process'
import { createHash, createPrivateKey, sign } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const REPO = 'ailtoncja/subaru-dl'
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

/**
 * Chave privada que assina cada instalador (o programa instalado só aceita versões com essa assinatura;
 * a pública está em src/main/atualizador.ts). Fica fora do repositório. Sem ela não dá para lançar versões
 * que os programas instalados aceitem: guarde uma cópia em lugar seguro.
 */
const CHAVE = process.env.SUBARU_CHAVE_ATUALIZACAO ?? join(homedir(), '.subaru-dl', 'chave-atualizacao.pem')
if (!existsSync(CHAVE)) {
  console.error(`Chave de assinatura não encontrada em ${CHAVE}. Sem ela, os programas instalados recusam a versão.`)
  process.exit(1)
}

// Comandos sem shell; o token do GitHub vai só para o electron-builder (o gh usa o próprio login)
const rodar = (programa, args, env = process.env) =>
  execFileSync(programa, args, { stdio: 'inherit', env, shell: process.platform === 'win32' && /^(npm|npx)$/.test(programa) })
const semToken = { ...process.env }
delete semToken.GH_TOKEN
delete semToken.GITHUB_TOKEN

rodar('npm', ['run', 'binarios'], semToken)
rodar('npx', ['electron-vite', 'build'], semToken)
// O rascunho já existe antes dos envios: sem isso cada envio paralelo cria a sua versão e os arquivos se dividem
// em duas (aconteceu na 0.8.1)
rodar('gh', ['release', 'create', `v${version}`, '--repo', REPO, '--draft', '--title', version, '--target', 'main', '--notes', ''], semToken)
const token = process.env.GH_TOKEN ?? execFileSync('gh', ['auth', 'token']).toString().trim()
rodar('npx', ['electron-builder', '--win', '--publish', 'always'], { ...semToken, GH_TOKEN: token })

// Assina o instalador: nome, versão e SHA-512 (o mesmo texto que src/main/atualizador.ts confere)
const instalador = join('dist', `Subaru-DL-Setup-${version}.exe`)
const sha512 = createHash('sha512').update(readFileSync(instalador)).digest('hex')
const assinatura = sign(null, Buffer.from(`Subaru DL ${version}\n${sha512}`), createPrivateKey(readFileSync(CHAVE)))
writeFileSync(`${instalador}.sig`, assinatura.toString('base64') + '\n')
rodar('gh', ['release', 'upload', `v${version}`, `${instalador}.sig`, '--repo', REPO, '--clobber'], semToken)

rodar('gh', ['release', 'edit', `v${version}`, '--repo', REPO, '--draft=false', '--latest'], semToken)
console.log(`\nVersão ${version} publicada e assinada: https://github.com/${REPO}/releases/tag/v${version}`)
