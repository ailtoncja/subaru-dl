/** Dicas automáticas para os erros mais comuns do yt-dlp (item 89). */
const DICAS: Array<[RegExp, string]> = [
  [/Sign in to confirm (your age|you.re not a bot)|age.restricted|inappropriate for some users/i,
    'O site pediu login. Ative os cookies em Ajustes → Rede e login.'],
  [/Private video|members.only|Join this channel|requires (a )?(login|authentication)|login required/i,
    'Esse vídeo exige uma conta com acesso. Ative os cookies do navegador em que você está logado.'],
  [/could not (copy|find).*cookie|cookie database|Permission denied.*Cookies|database is locked/i,
    'Não deu para ler os cookies. Feche o navegador por completo e tente de novo, ou use um arquivo cookies.txt.'],
  [/Failed to decrypt with DPAPI|app.bound encryption/i,
    'O Chrome e o Edge bloqueiam a leitura dos cookies. Use o Firefox ou importe um cookies.txt em Ajustes → Rede e login.'],
  [/HTTP Error 429|Too Many Requests|rate.limit/i,
    'O site limitou as requisições. Espere alguns minutos ou use cookies/proxy.'],
  [/HTTP Error 403|Forbidden/i,
    'Acesso negado pelo site. Atualize o yt-dlp em Ajustes → Ferramentas; se continuar, ative "Usar o player.js real" ou os cookies em Ajustes → Rede e login.'],
  [/Video unavailable|This video is not available|has been removed|does not exist|404/i,
    'O vídeo não está mais disponível ou o link está errado.'],
  [/not available in your country|geo.?restrict/i,
    'Vídeo bloqueado na sua região. Tente com um proxy em Ajustes → Rede e login.'],
  [/Unsupported URL/i, 'Esse site não é suportado pelo yt-dlp.'],
  [/Requested format is not available/i,
    'O formato escolhido não existe para esse vídeo. Troque a qualidade/codec ou escolha "Melhor".'],
  [/ffmpeg.*not (found|installed)|ffprobe.*not found/i,
    'O ffmpeg não foi encontrado. Abra Ajustes → Ferramentas e atualize tudo.'],
  [/n challenge|nsig|JS runtime|No supported JavaScript runtime|signature extraction failed/i,
    'Falha ao resolver o JavaScript do YouTube. Atualize o yt-dlp e o Deno em Ajustes → Ferramentas.'],
  [/No space left on device|Errno 28/i, 'Disco cheio. Libere espaço ou escolha outra pasta.'],
  [/Permission denied|Access is denied|WinError 5/i,
    'Sem permissão para gravar na pasta. Escolha outra pasta de destino.'],
  [/timed out|Connection reset|getaddrinfo failed|Unable to connect|NameResolutionError/i,
    'Problema de conexão. Verifique a internet ou o proxy.'],
  [/This live event will begin|Premieres in|live event will begin/i, 'A live ainda não começou.']
]

export function dicaParaErro(texto: string): string | null {
  for (const [padrao, dica] of DICAS) if (padrao.test(texto)) return dica
  return null
}
