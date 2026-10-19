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
      <label className="rotulado largo legenda-simples" title="Usa a legenda do vídeo; se não tiver, a automática">
        <span>Legenda</span>
        <span className="flex" style={{ height: 38, color: 'var(--tinta)', fontWeight: 400, fontSize: 14 }}>
          <input type="checkbox" checked={l.ativas} onChange={(e) => alterar({ ativas: e.target.checked, automaticas: e.target.checked ? true : l.automaticas })} />
          Legendas {idioma} (ou automática)
        </span>
      </label>
    )
  }

  const { manuais, automaticas } = opcoesLegenda(info.legendas, info.legendasAuto)
  if (!manuais.length && !automaticas.length) {
    return (
      <label className="rotulado largo">
        <span>Legenda</span>
        <select disabled value="">
          <option value="">Este vídeo não tem legendas</option>
        </select>
      </label>
    )
  }

  const valor = valorLegenda(l)
  return (
    <>
      <label className="rotulado largo">
        <span>Legenda</span>
        <select value={valor} onChange={(e) => alterar(aplicarLegenda(l, e.target.value))}>
          <option value="">Nenhuma</option>
          {valor === 'padrao' && <option value="padrao">{l.todas ? 'Todas' : l.idiomas.map((i) => nomeIdioma(i).split(' · ')[0]).join(', ')} (padrão)</option>}
          {manuais.length > 0 && (
            <optgroup label="Legendas do vídeo">
              {manuais.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.nome}
                </option>
              ))}
            </optgroup>
          )}
          {automaticas.length > 0 && (
            <optgroup label="Automáticas (geradas pelo site)">
              {automaticas.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.nome} · automática
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {valor && (
        <label className="rotulado estreito" title="Embutida fica dentro do vídeo; separada vira um arquivo .srt ao lado">
          <span>Como</span>
          <select value={l.embutir ? 'embutir' : 'separado'} onChange={(e) => alterar({ embutir: e.target.value === 'embutir' })}>
            <option value="embutir">Embutida</option>
            <option value="separado">Separada</option>
          </select>
        </label>
      )}
    </>
  )
}
