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
2. Rode `npm run publicar` (precisa do GitHub CLI logado e da chave de assinatura, abaixo).

Isso sobe o instalador, o `.blockmap`, o `latest.yml` e a assinatura `.sig` como rascunho da versão `v<versão>` em
Releases e, quando tudo chegou, publica. Quem tem o programa instalado recebe a versão nova sozinho.

**Assinatura das versões (desde a 0.9.0).** O instalador não tem certificado do Windows, então cada versão leva um
`Subaru-DL-Setup-<versão>.exe.sig`: uma assinatura Ed25519 do nome, da versão e da soma SHA-512 do instalador. O
programa instalado confere essa assinatura com a chave pública embutida (`src/main/atualizador.ts`) antes de oferecer
a versão; sem ela, a versão é recusada e apagada. Assim, quem conseguir publicar no GitHub (conta ou token vazado)
não consegue fazer os programas instalarem nada. A chave privada fica **fora do repositório**, em
`%USERPROFILE%\.subaru-dl\chave-atualizacao.pem` (ou no caminho da variável `SUBARU_CHAVE_ATUALIZACAO`).
**Guarde uma cópia em lugar seguro**: sem ela não dá para lançar versões que os programas instalados aceitem.

As ferramentas embutidas (e as atualizações delas pelo programa) são conferidas pela soma SHA-256 que o GitHub
publica de cada arquivo; o aria2, sem versões novas desde 2023, tem a soma fixada no código.

Para testar em desenvolvimento sem mexer no programa instalado: crie um `dev-app-update.yml` na raiz do projeto com
`provider: github`, `owner: ailtoncja`, `repo: subaru-dl` e `publisherName: [Subaru DL]`, baixe a versão do
`package.json` para uma menor que a publicada e abra com `SUBARU_TESTAR_ATUALIZACAO=1 npx electron-vite dev`.

## Segurança

- A interface só fala com o motor pela janela do próprio programa, e o motor confere tudo o que chega: pastas e
  arquivos só os escolhidos na janela do Windows, opções que rodam programas (`--exec`, `--downloader`…) recusadas
  nos argumentos extras, e só arquivos baixados podem ser abertos.
- Senhas, token e cabeçalhos ficam no cofre do Windows, nunca voltam para a interface e só vão para os sites listados
  em "Sites onde usar o login", por um arquivo temporário (não pela linha de comando).
- Os cookies do programa ficam cifrados; o yt-dlp e o gallery-dl recebem uma cópia temporária apagada no fim. O
  cookies.txt exportado por extensão vai para a Lixeira depois de importado.
- Envio de cookies ao celular: só para endereços da rede local, só os dos sites de vídeo e imagem, com o código de 16
  letras do app do celular (1.6.0 ou mais novo).
- Capas e miniaturas passam pelo motor (nunca carregadas direto pela interface), só de endereços públicos e com limite
  de tamanho. Sem ferramentas de desenvolvedor no programa instalado.
