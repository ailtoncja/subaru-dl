// Legenda do vídeo: escolhe entre as que existem de verdade (e as automáticas) e se vai embutida ou separada.
import type { InfoMidia, OpcoesDownload } from '@shared/tipos'
import { aplicarLegenda, opcoesLegenda, valorLegenda } from '@shared/legendas'
import { nomeIdioma } from '@shared/formatar'

export function SelecaoLegenda({ info, o, mudar }: { info: InfoMidia; o: OpcoesDownload; mudar: (p: Partial<OpcoesDownload>) => void }) {
  const l = o.legendas
  const alterar = (parcial: Partial<OpcoesDownload['legendas']>) => mudar({ legendas: { ...l, ...parcial } })

  // Playlist: a lista rápida não traz as legendas de cada vídeo, então liga por idioma e deixa o yt-dlp procurar
  if (info.playlist) {
    const idioma = (l.idiomas[0] ?? 'pt').toUpperCase()
    return (
      <label className="legenda-simples" title="Usa a legenda do vídeo; se não tiver, a automática">
        <input type="checkbox" checked={l.ativas} onChange={(e) => alterar({ ativas: e.target.checked, automaticas: e.target.checked ? true : l.automaticas })} />
        Legendas {idioma} (ou automática)
      </label>
    )
  }

  const { manuais, automaticas } = opcoesLegenda(info.legendas, info.legendasAuto)
  if (!manuais.length && !automaticas.length) {
    return (
      <select className="legenda" disabled value="">
        <option value="">Legenda: este vídeo não tem legendas</option>
      </select>
    )
  }

  const valor = valorLegenda(l)
  return (
    <>
      <select className={valor ? 'legenda com-modo' : 'legenda'} value={valor} onChange={(e) => alterar(aplicarLegenda(l, e.target.value))}>
        <option value="">Legenda: nenhuma</option>
        {valor === 'padrao' && <option value="padrao">Legenda: {l.todas ? 'todas' : l.idiomas.map((i) => nomeIdioma(i).split(' · ')[0]).join(', ')} (padrão)</option>}
        {manuais.length > 0 && (
          <optgroup label="Legendas do vídeo">
            {manuais.map((x) => (
              <option key={x.valor} value={x.valor}>
                Legenda: {x.nome}
              </option>
            ))}
          </optgroup>
        )}
        {automaticas.length > 0 && (
          <optgroup label="Automáticas (geradas pelo site)">
            {automaticas.map((x) => (
              <option key={x.valor} value={x.valor}>
                Legenda: {x.nome} · automática
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {valor && (
        <select title="Embutida fica dentro do vídeo; separada vira um arquivo .srt ao lado" value={l.embutir ? 'embutir' : 'separado'} onChange={(e) => alterar({ embutir: e.target.value === 'embutir' })}>
          <option value="embutir">Embutida</option>
          <option value="separado">Separada</option>
        </select>
      )}
    </>
  )
}
