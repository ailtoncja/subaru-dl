import { FileCheck2, FileX2 } from 'lucide-react'
import { tempoRelativo } from '@shared/formatar'
import { avisar, useEstado } from '../estado'
import { Dialogo } from './ui'

/** Pergunta o que fazer com links que já foram baixados antes (item 8). */
export function DialogoDuplicados() {
  const pedido = useEstado((s) => s.duplicados)
  if (!pedido) return null
  const fechar = () => useEstado.setState({ duplicados: null })

  const adicionarMesmoAssim = async () => {
    if (pedido.lote) await window.api.adicionarLote(pedido.lote, pedido.iniciar, true)
    else await window.api.adicionarMesmoAssim(pedido.urls, pedido.opcoes, pedido.iniciar)
    fechar()
  }

  const pular = () => {
    avisar(`${pedido.duplicados.length} link(s) já baixado(s) foram pulados`)
    fechar()
  }

  return (
    <Dialogo
      titulo="Já baixados antes"
      aoFechar={pular}
      rodape={
        <>
          <button className="btn" onClick={pular}>
            Pular
          </button>
          <button className="btn primario" onClick={adicionarMesmoAssim}>
            Baixar de novo
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }} className="muted">
        {pedido.duplicados.length === 1 ? 'Esse link já foi baixado.' : `${pedido.duplicados.length} links já foram baixados.`}
        {pedido.adicionados > 0 && ` Os outros ${pedido.adicionados} foram adicionados à fila.`}
      </p>
      <div className="cartao">
        {pedido.duplicados.slice(0, 8).map((d) => (
          <div className="linha" key={d.url}>
            {d.arquivoExiste ? <FileCheck2 className="ok-texto" /> : <FileX2 className="erro-texto" />}
            <div className="rotulo">
              <div className="truncar">{d.titulo}</div>
              <small>
                Baixado {tempoRelativo(d.baixadoEm)} · {d.arquivoExiste ? 'arquivo ainda existe' : 'arquivo não encontrado'}
              </small>
            </div>
          </div>
        ))}
        {pedido.duplicados.length > 8 && (
          <div className="linha muted pequeno">e mais {pedido.duplicados.length - 8}…</div>
        )}
      </div>
    </Dialogo>
  )
}
