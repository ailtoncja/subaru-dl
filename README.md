# Subaru DL

Interface gráfica para o **yt-dlp** no Windows, com o visual das extensões Subaru (azul-marinho, amarelo e dourado).
Baixa vídeos, áudios, playlists e canais de mais de 1.800 sites.

Vem com tudo embutido: **yt-dlp**, **Deno** (JavaScript do YouTube), **ffmpeg + ffprobe**, **gallery-dl** e **aria2**.
O que já está feito e o que vem depois está no [ROADMAP.md](ROADMAP.md).

## Instalar

Baixe o `Subaru-DL-Setup-<versão>.exe` mais novo na página de
[versões (Releases)](https://github.com/ailtoncja/subaru-dl/releases/latest) e rode.
Depois disso o programa se atualiza sozinho: procura versões novas ao abrir e a cada 6 horas, baixa em segundo
plano e mostra "Versão X pronta · Reiniciar" na barra de título (ou instala quando você sai do programa).

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
| `npm run instalador` | Gera `dist\Subaru-DL-Setup-<versão>.exe` (sem publicar) |
| `npm run publicar` | Gera e publica a versão no GitHub, que alimenta a atualização automática (`scripts/publicar.mjs`) |
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

O programa usa o electron-updater e procura as versões publicadas neste repositório
(`publish` no `electron-builder.yml`; o código fica em `src/main/atualizador.ts`).

Para lançar uma versão nova:

1. Suba a versão no `package.json` (ex.: `0.8.1`) e faça o commit.
2. Rode `npm run publicar` (precisa do GitHub CLI logado, ou da variável `GH_TOKEN`).

Isso sobe o instalador, o `.blockmap` e o `latest.yml` como rascunho da versão `v<versão>` em Releases e, quando os
três chegaram, publica. Quem tem o programa instalado recebe a versão nova sozinho.

Para testar em desenvolvimento sem mexer no programa instalado: crie um `dev-app-update.yml` na raiz do projeto com
`provider: github`, `owner: ailtoncja` e `repo: subaru-dl`, baixe a versão do `package.json` para uma menor que a
publicada e abra com `SUBARU_TESTAR_ATUALIZACAO=1 npx electron-vite dev`.
