# Subaru DL — Roadmap

Interface gráfica para o yt-dlp no Windows, com o visual Subaru (azul-marinho, amarelo e dourado, só tema escuro).
Tudo em português do Brasil. Instalador `.exe` com todas as ferramentas embutidas.

**Ferramentas embutidas:** yt-dlp · Deno · ffmpeg + ffprobe · gallery-dl · aria2

**Stack:** Electron + Vite + React + TypeScript · instalador NSIS (electron-builder)

Legenda: `[ ]` a fazer · `[x]` pronto

---

## Fase 1 — Downloader completo

### A. Entrada de links
- [ ] 1. Colar um link
- [ ] 2. Vários links de uma vez (um por linha)
- [ ] 3. Importar `.txt` com links e arrastar e soltar
- [ ] 4. Monitorar a área de transferência
- [ ] 5. Atalhos globais (adicionar à fila / baixar a fila / adicionar e baixar já)
- [ ] 6. Busca no YouTube dentro do app, com filtros
- [ ] 7. Link com vídeo + playlist → baixar só o vídeo
- [ ] 8. Detectar já baixados (perguntar / pular / permitir)
- [ ] 9. Guia rápido de dicas

### B. Qualidade e formato
- [ ] 10. Qualidade padrão 360p → 8K / Melhor
- [ ] 11. Escolher o formato exato da lista real do vídeo
- [ ] 12. Codec de vídeo (Auto/H.264/VP9/AV1) e de áudio
- [ ] 13. Taxa de quadros: original ou até 30 FPS
- [ ] 14. Contêiner MP4 / MKV / WebM
- [ ] 15. Só áudio: MP3, M4A, Opus, AAC, OGG, WAV, FLAC + bitrate
- [ ] 16. Faixa de áudio / idioma (dublagens)
- [ ] 17. Tamanho estimado antes de baixar
- [ ] 18. Manter streams originais (sem conversão)

### C. Fila e downloads
- [ ] 19. Fila com progresso, velocidade, tempo restante e status
- [ ] 20. Pausar e retomar (por item e todos)
- [ ] 21. Downloads simultâneos configuráveis
- [ ] 22. Tentar de novo automaticamente (tentativas + intervalo)
- [ ] 25. Salvar a fila ao fechar e restaurar ao abrir
- [ ] 26. Filtrar a fila (todos / ativos / concluídos / falhos)
- [ ] 27. Ações por item: abrir, mostrar na pasta, copiar link, renomear, trocar pasta
- [ ] 28. Aria2 (várias conexões)
- [ ] 29. Preferências por item

### D. Playlists
- [ ] 30. Baixar playlist inteira
- [ ] 31. Escolher itens da playlist (checkbox + intervalos)
- [ ] 32. Limite de vídeos por playlist
- [ ] 33. Numerar arquivos da playlist (normal ou invertido)

### E. Trechos e capítulos
- [ ] 35. Baixar só um trecho (início/fim)
- [ ] 36. Baixar capítulos específicos
- [ ] 37. Separar em arquivos por capítulo
- [ ] 38. Corte preciso (frame exato)

### F. Lives
- [ ] 39. Baixar a live desde o começo

### G. Legendas
- [ ] 42. Baixar legendas manuais e automáticas, escolhendo idiomas
- [ ] 43. Formato SRT / VTT / ASS / TTML / JSON
- [ ] 44. Embutir legenda no vídeo

### H. Pós-processamento
- [ ] 45. Embutir metadados
- [ ] 46. Embutir capa
- [ ] 47. Salvar miniatura como arquivo
- [ ] 49. Recodificar 30fps / mp42 / argumentos ffmpeg personalizados

### I. Pastas e nomes
- [ ] 50. Pasta de destino (separada para vídeo e áudio)
- [ ] 51. Subpastas: playlist, canal, canal→playlist, ano/mês, artista→álbum, personalizado
- [ ] 52. Modelo de nome (título, título+qualidade, playlist+título, personalizado)
- [ ] 53. Dados no nome (data, views, canal, duração, resolução, ID)
- [ ] 54. Nomes seguros (sem espaços/caracteres especiais)

### J. Filtros de entrada
- [ ] 55. Tamanho mínimo / máximo
- [ ] 56. Data de upload
- [ ] 57. Filtros avançados do yt-dlp

### K. Login, cookies e rede
- [ ] 58. Cookies do navegador (navegador + perfil)
- [ ] 59. Cookies de arquivo `cookies.txt`
- [ ] 60. Não usar cookies em certos sites
- [ ] 61. Usuário/senha, senha de vídeo, token, cabeçalhos (cofre do Windows)
- [ ] 62. Proxy HTTP / SOCKS5
- [ ] 63. Se passar por um navegador real (impersonate)
- [ ] 64. Opções avançadas / argumentos de extrator do yt-dlp
- [ ] 65. Correção do YouTube "usar o player.js real"

### P. Sistema e app
- [ ] 83. Ícone na bandeja, minimizar para a bandeja ao fechar
- [ ] 84. Iniciar com o Windows (minimizado)
- [ ] 86. Atualização automática do app
- [ ] 87. Atualizar yt-dlp / Deno / ffmpeg / gallery-dl / aria2 (estável ou nightly)
- [ ] 88. Tela de dependências
- [ ] 89. Logs com filtros, exportação e dicas automáticas de erro
- [ ] 92. Busca dentro das configurações

---

## Fase 2 — Biblioteca e dados

### L. Biblioteca
- [ ] 66. Biblioteca com busca, ordenação e filtros
- [ ] 67. Tags e coleções
- [ ] 68. Baixar de novo, renomear, excluir (opção de apagar o arquivo)
- [ ] 69. Avisar quando o arquivo sumiu
- [ ] 70. Dividir arquivo em partes a cada X minutos

### M. Dados
- [ ] 72. Baixar só informações (JSON, descrição, comentários, miniatura, legendas)
- [ ] 73. Exportar lista de playlist/canal (CSV, Excel, JSON, Markdown…)
- [ ] 75. Ver detalhes do vídeo (views, likes, capítulos, descrição)

---

## Fase 3 — Galeria
- [ ] 74. Galeria de imagens com gallery-dl (Instagram, Twitter, artistas, mangás)

---

## Fora do escopo (removidos)
23 limite de velocidade · 24 agendar downloads · 34 seguir canais · 40 pular lives · 41 agendar live ·
48 SponsorBlock · 71 player embutido · 76 resumo com IA · 77 edição por chat com IA · 78 editor de legendas ·
79 extensão do navegador · 80 Telegram · 81 plugins · 82 CLI · 85 notificações · 90 temas (só escuro) ·
91 vários idiomas (só PT-BR) · 93 aviso de uso
