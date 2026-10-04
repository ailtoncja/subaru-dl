// Ferramenta de teste: conversa com o app aberto via Chrome DevTools Protocol.
// Abra o app com:  npx electron-vite dev --remoteDebuggingPort 9222
// Uso: node scripts/cdp.mjs eval "<expressão JS>"
//      node scripts/cdp.mjs foto caminho.png
//      node scripts/cdp.mjs frente   (traz a janela para frente)
import { writeFileSync } from 'node:fs'

const [, , comando, arg] = process.argv
const alvos = await (await fetch('http://127.0.0.1:9222/json')).json()
const pagina = alvos.find((a) => a.type === 'page' && !a.url.startsWith('devtools'))
if (!pagina) throw new Error('Janela do app não encontrada')

const ws = new WebSocket(pagina.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pendentes = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pendentes.has(msg.id)) {
    pendentes.get(msg.id)(msg)
    pendentes.delete(msg.id)
  }
})
const enviar = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id
    pendentes.set(n, resolve)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

if (comando === 'eval') {
  const r = await enviar('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) console.error('ERRO:', r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)
  else console.log(JSON.stringify(r.result?.result?.value, null, 2))
} else if (comando === 'frente') {
  await enviar('Page.bringToFront')
  console.log('janela na frente')
} else if (comando === 'foto') {
  const r = await enviar('Page.captureScreenshot', { format: 'png' })
  writeFileSync(arg, Buffer.from(r.result.data, 'base64'))
  console.log('foto salva em', arg)
}
ws.close()
