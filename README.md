# Subaru DL

Interface gráfica para o **yt-dlp** no Windows, com o visual das extensões Subaru (azul-marinho, amarelo e dourado).
Baixa vídeos, áudios, playlists e canais de mais de 1.800 sites.

Vem com tudo embutido: **yt-dlp**, **Deno** (JavaScript do YouTube), **ffmpeg + ffprobe**, **gallery-dl** e **aria2**.
O que já está feito e o que vem depois está no [ROADMAP.md](ROADMAP.md).

## Instalar

Rode `dist\Subaru-DL-Setup-<versão>.exe`.

Como o instalador não tem certificado de assinatura, na primeira vez o Windows mostra
"O Windows protegeu o computador": clique em **Mais informações → Executar assim mesmo**.

As configurações, a fila e as ferramentas ficam em `%APPDATA%\Subaru DL`.

## Desenvolver

Precisa do Node.js 22 ou mais novo.

```
npm install
npm run binarios   # baixa yt-dlp, Deno, ffmpeg, gallery-dl e aria2 para resources\bin
npm run dev        # abre o app com recarga automática da interface
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run instalador` | Gera `dist\Subaru-DL-Setup-<versão>.exe` |
| `npm run binarios -- --forcar` | Baixa de novo todas as ferramentas |
| `powershell -File scripts\gerar-icone.ps1` | Recria o ícone (`build\icon.ico` e `resources\icone*.png`) |

Para testar o app aberto por linha de comando: `npx electron-vite dev --remoteDebuggingPort 9222`
e depois `node scripts/cdp.mjs eval "<js>"` ou `node scripts/cdp.mjs foto tela.png`.

## Estrutura

```
src/main/       motor (processo principal do Electron)
  fila.ts         fila de downloads: simultâneos, pausa, novas tentativas, progresso
  ytdlp.ts        transforma as opções da interface em argumentos do yt-dlp
  historico.ts    tudo o que já foi baixado (Downloads → Concluídos) e detecção de duplicados
  galeria.ts      fila de imagens com o gallery-dl
  ferramentas.ts  ferramentas embutidas: localização, versões e atualização
  configuracoes.ts, logs.ts, sistema.ts (bandeja, atalhos, área de transferência)
src/preload/    ponte segura entre interface e motor (window.api)
src/renderer/   interface em React
src/shared/     tipos, formatação e regras usadas pelos dois lados
```

## Atualização automática do programa

O código já está pronto (electron-updater). Para ativar, crie um repositório no GitHub,
adicione ao `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: <seu-usuario>
  repo: subaru-dl
```

e publique cada versão nova com `npx electron-builder --win --publish always` (precisa da variável `GH_TOKEN`).
