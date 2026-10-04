# Subaru DL — Roadmap

Interface gráfica para o yt-dlp no Windows, com o visual Subaru (azul-marinho, amarelo e dourado, só tema escuro).
Tudo em português do Brasil. Instalador `.exe` com todas as ferramentas embutidas.

**Ferramentas embutidas:** yt-dlp · Deno · ffmpeg + ffprobe · gallery-dl · aria2

**Stack:** Electron + Vite + React + TypeScript · instalador NSIS (electron-builder)

Legenda: `[ ]` a fazer · `[x]` pronto

---

## Fase 1 — Downloader completo ✅

### A. Entrada de links
- [x] 1. Colar um link
- [x] 2. Vários links de uma vez (um por linha)
- [x] 3. Importar `.txt` com links e arrastar e soltar
- [x] 4. Monitorar a área de transferência
- [x] 5. Atalhos globais (adicionar à fila / baixar a fila / adicionar e baixar já)
- [x] 6. Busca no YouTube dentro do app, com filtros
- [x] 7. Link com vídeo + playlist → baixar só o vídeo
- [x] 8. Detectar já baixados (perguntar / pular / permitir)
- [x] 9. Guia rápido de dicas

### B. Qualidade e formato
- [x] 10. Qualidade padrão 360p → 8K / Melhor
- [x] 11. Escolher o formato exato da lista real do vídeo
- [x] 12. Codec de vídeo (Auto/H.264/VP9/AV1) e de áudio
- [x] 13. Taxa de quadros: original ou até 30 FPS
- [x] 14. Contêiner MP4 / MKV / WebM
- [x] 15. Só áudio: MP3, M4A, Opus, AAC, OGG, WAV, FLAC + bitrate
- [x] 16. Faixa de áudio / idioma (dublagens)
- [x] 17. Tamanho estimado antes de baixar
- [x] 18. Manter streams originais (sem conversão)

### C. Fila e downloads
- [x] 19. Fila com progresso, velocidade, tempo restante e status
- [x] 20. Pausar e retomar (por item e todos)
- [x] 21. Downloads simultâneos configuráveis
- [x] 22. Tentar de novo automaticamente (tentativas + intervalo)
- [x] 25. Salvar a fila ao fechar e restaurar ao abrir
- [x] 26. Filtrar a fila (todos / ativos / concluídos / falhos)
- [x] 27. Ações por item: abrir, mostrar na pasta, copiar link, renomear, trocar pasta
- [x] 28. Aria2 (várias conexões)
- [x] 29. Preferências por item

### D. Playlists
- [x] 30. Baixar playlist inteira
- [x] 31. Escolher itens da playlist (checkbox + intervalos)
- [x] 32. Limite de vídeos por playlist
- [x] 33. Numerar arquivos da playlist (normal ou invertido)

### E. Trechos e capítulos
- [x] 35. Baixar só um trecho (início/fim)
- [x] 36. Baixar capítulos específicos
- [x] 37. Separar em arquivos por capítulo
- [x] 38. Corte preciso (frame exato)

### F. Lives
- [x] 39. Baixar a live desde o começo

### G. Legendas
- [x] 42. Baixar legendas manuais e automáticas, escolhendo idiomas
- [x] 43. Formato SRT / VTT / ASS / TTML / JSON
- [x] 44. Embutir legenda no vídeo

### H. Pós-processamento
- [x] 45. Embutir metadados
- [x] 46. Embutir capa
- [x] 47. Salvar miniatura como arquivo
- [x] 49. Recodificar 30fps / mp42 / argumentos ffmpeg personalizados

### I. Pastas e nomes
- [x] 50. Pasta de destino (separada para vídeo e áudio)
- [x] 51. Subpastas: playlist, canal, canal→playlist, ano/mês, artista→álbum, personalizado
- [x] 52. Modelo de nome (título, título+qualidade, playlist+título, personalizado)
- [x] 53. Dados no nome (data, views, canal, duração, resolução, ID)
- [x] 54. Nomes seguros (sem espaços/caracteres especiais)

### J. Filtros de entrada
- [x] 55. Tamanho mínimo / máximo
- [x] 56. Data de upload
- [x] 57. Filtros avançados do yt-dlp

### K. Login, cookies e rede
- [x] 58. Cookies do navegador (navegador + perfil)
- [x] 59. Cookies de arquivo `cookies.txt`
- [x] 60. Não usar cookies em certos sites
- [x] 61. Usuário/senha, senha de vídeo, token, cabeçalhos (cofre do Windows)
- [x] 62. Proxy HTTP / SOCKS5
- [x] 63. Se passar por um navegador real (impersonate)
- [x] 64. Opções avançadas / argumentos de extrator do yt-dlp
- [x] 65. Correção do YouTube "usar o player.js real"

### P. Sistema e app
- [x] 83. Ícone na bandeja, minimizar para a bandeja ao fechar
- [x] 84. Iniciar com o Windows (minimizado)
- [x] 86. Atualização automática do app (falta só criar o repositório no GitHub para publicar as versões)
- [x] 87. Atualizar yt-dlp / Deno / ffmpeg / gallery-dl / aria2 (estável ou nightly)
- [x] 88. Tela de dependências
- [x] 89. Logs com filtros, exportação e dicas automáticas de erro
- [x] 92. Busca dentro das configurações

---

## Fase 2 — Biblioteca e dados ✅

### L. Biblioteca
- [x] 66. Biblioteca com busca, ordenação e filtros
- [x] 67. Tags e coleções
- [x] 68. Baixar de novo, renomear, excluir (opção de apagar o arquivo)
- [x] 69. Avisar quando o arquivo sumiu
- [x] 70. Dividir arquivo em partes a cada X minutos

### M. Dados
- [x] 72. Baixar só informações (JSON, descrição, comentários, miniatura, legendas)
- [x] 73. Exportar lista de playlist/canal (CSV, Excel, JSON, Markdown…)
- [x] 75. Ver detalhes do vídeo (views, likes, capítulos, descrição)

---

## Fase 3 — Galeria ✅
- [x] 74. Galeria de imagens com gallery-dl (Instagram, Twitter, artistas, mangás)

---

## Fora do escopo (removidos)
23 limite de velocidade · 24 agendar downloads · 34 seguir canais · 40 pular lives · 41 agendar live ·
48 SponsorBlock · 71 player embutido · 76 resumo com IA · 77 edição por chat com IA · 78 editor de legendas ·
79 extensão do navegador · 80 Telegram · 81 plugins · 82 CLI · 85 notificações · 90 temas (só escuro) ·
91 vários idiomas (só PT-BR) · 93 aviso de uso
