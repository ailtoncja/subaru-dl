# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público geral de língua portuguesa no Windows: qualquer pessoa que queira baixar vídeo, áudio, playlists ou
imagens da internet sem saber o que é yt-dlp. O autor (Ailton) usa no dia a dia e já passa o instalador para
amigos leigos; a intenção confirmada é divulgar para o público em geral.

Situação típica: a pessoa está no navegador, copia um link e quer o arquivo no computador com o mínimo de passos.

## Product Purpose

Subaru DL é um programa de Windows que baixa vídeos, áudios, playlists, canais e galerias de imagens de mais de
1.800 sites, com yt-dlp e gallery-dl por baixo, sem terminal e sem instalar nada à parte.

Sucesso: colar um link e ter o arquivo certo, na qualidade certa, na pasta certa, sem precisar entender as
ferramentas.

Os quatro trabalhos principais, todos de primeira classe (confirmado):

1. Colar um link e baixar o vídeo.
2. Baixar só o áudio (MP3).
3. Baixar playlists e canais inteiros, escolhendo os itens.
4. Baixar imagens de perfis (Galeria: Instagram, X, Bluesky…).

## Positioning

Confirmado pelo autor como o que diferencia o Subaru DL:

- **Tudo embutido:** yt-dlp, Deno, ffmpeg + ffprobe, gallery-dl e aria2 vêm no instalador; nada para instalar
  ou configurar antes do primeiro download.
- **Simples e em português do Brasil:** feito para quem não entende de yt-dlp.
- **Identidade própria Subaru:** a mesma família visual das extensões de navegador e do app Android do autor.
- **Junto com o celular:** app Android irmão (Subaru DL Mobile) e envio de cookies do PC para o celular pelo Wi-Fi.

## Operating Context

- Windows. Instalador NSIS sem certificado de assinatura: na primeira execução o Windows mostra o aviso do
  SmartScreen ("Mais informações → Executar assim mesmo").
- O link chega do navegador: colar (Ctrl+V ou botão "Colar URL"), monitor da área de transferência e atalhos
  globais.
- Downloads rodam em fila, em segundo plano; o programa pode ficar na bandeja e iniciar com o Windows.
- Login em sites (vídeos privados, restrição de idade, perfis) por cookies: lidos do navegador (o Firefox funciona
  automático; Chrome e Edge novos bloqueiam leitura externa e exigem exportar um cookies.txt por extensão) ou de um
  arquivo. Os cookies podem ser enviados ao celular.
- As ferramentas embutidas são atualizadas pelo próprio programa (tela Dependências).

## Capabilities and Constraints

Capacidades confirmadas (detalhes em ROADMAP.md):

- Vídeo e áudio: qualidade, formato, codecs, limite de 30 FPS, faixa de áudio (a original como padrão), trechos e
  capítulos, lives desde o começo.
- Legendas: do autor ou automáticas, embutidas ou em arquivo, escolhidas entre as que o vídeo tem.
- Playlists e canais com miniaturas e escolha de itens; vários links de uma vez (Shift+Enter manda para a lista).
- Fila: downloads simultâneos, pausar, retomar depois de fechar, novas tentativas; histórico com detecção de
  repetidos e "baixar de novo".
- Galeria (gallery-dl): prévia com miniaturas, baixar só os marcados, pular o que já foi baixado.
- Pastas e nomes: organização em subpastas, pasta própria por link, modelos de nome.
- Filtros de entrada (tamanho, data, filtros do yt-dlp); rede (proxy, impersonar navegador, argumentos extras);
  acelerador aria2.
- Sistema: bandeja, iniciar com o Windows, atalhos globais, monitor da área de transferência, atualização
  automática do app, Dependências, Logs com dicas de erro, busca dentro das Configurações.

Restrições:

- Electron + Vite + React + TypeScript; a interface fala com o motor só por `window.api` (preload).
- Só português do Brasil e só tema escuro (decisões do autor).
- Tamanho do instalador não importa: tudo continua embutido.
- Fora do escopo, não reintroduzir: busca no YouTube, guia de dicas, biblioteca (tags, coleções, dividir), página
  Dados, widget de armazenamento, limite de velocidade, agendar downloads, seguir canais, pular ou agendar lives,
  SponsorBlock, player embutido, IA (resumo, edição), editor de legendas, extensão do navegador, Telegram, plugins,
  CLI, notificações, temas, vários idiomas, aviso de uso.
- Dados do usuário em `%APPDATA%\Subaru DL`; o desenvolvimento usa `%APPDATA%\Subaru DL (dev)`.

Em aberto: a publicação pública. O repositório no GitHub ainda é privado, e a atualização automática do app só
funciona depois de publicar as versões.

## Brand Commitments

- Nome: **Subaru DL**. Ícone em `build/icon.ico` e `resources/icone.png` / `resources/icone-bandeja.png`.
- Visual "Subaru" das extensões do autor, definido por ele como obrigatório: azul-marinho `#0c1430`, amarelo
  `#ffd200`, dourado `#d9b44a`; só tema escuro.
- Família de produtos: extensões de navegador do autor (Auto Qualidade HD, Volume Turbo, Subaru's Block) e o app
  Android Subaru DL Mobile.

## Evidence on Hand

- Ícone do app (arquivos acima) e o código atual da interface.
- Não existem depoimentos, número de usuários, avaliações, imprensa nem site: não inventar.
- O instalador não tem assinatura digital.

## Product Principles

1. **Colar e baixar vem primeiro.** O caminho link → arquivo precisa ser óbvio para quem nunca ouviu falar de
   yt-dlp; o autor quer a interface o mais simples possível. Opções avançadas existem, mas nunca na frente.
2. **Os quatro trabalhos são de primeira classe.** Vídeo, áudio, playlists e canais, e galeria de imagens: nenhum
   fica escondido atrás de outro.
3. **Nada para instalar, nada para configurar** antes do primeiro download.
4. **Honesto sobre limites.** Quando um site ou navegador bloqueia algo, dizer em português simples o que aconteceu
   e oferecer o caminho que funciona.
5. **Produto de família.** Reconhecível como Subaru ao lado das extensões e do app Android.
