import { Cpu, Download, FileCode2, Film, Images, Loader2, RefreshCw, Zap } from 'lucide-react'
import type { NomeFerramenta } from '@shared/tipos'
import { LinhaInterruptor, Linha, Secao, Selecao } from '../componentes/ui'
import { salvarConfig, useEstado } from '../estado'

const ICONES: Record<NomeFerramenta, typeof Cpu> = {
  'yt-dlp': Download,
  deno: FileCode2,
  ffmpeg: Film,
  'gallery-dl': Images,
  aria2: Zap
}

/** Ferramentas embutidas: versões e atualização (itens 87 e 88). */
export default function Dependencias() {
  const { ferramentas, config } = useEstado()
  const c = config!
  const algumaAtualizando = ferramentas.some((f) => f.atualizando)

  const atualizarTodas = async () => {
    for (const f of ferramentas) await window.api.atualizarFerramenta(f.nome)
  }

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Dependências</h1>
        <button className="btn" disabled={algumaAtualizando} onClick={() => window.api.ferramentas().then((f) => useEstado.setState({ ferramentas: f }))}>
          <RefreshCw /> Verificar versões
        </button>
        <button className="btn amarelo" disabled={algumaAtualizando} onClick={atualizarTodas}>
          <Download /> Atualizar tudo
        </button>
      </div>
      <div className="secao" style={{ gap: 18 }}>
        <Secao titulo="Ferramentas embutidas">
          {ferramentas.map((f) => {
            const Icone = ICONES[f.nome]
            return (
              <div className="ferramenta" key={f.nome}>
                <div className="icone">
                  <Icone />
                </div>
                <div className="flex-1">
                  <strong>{f.nome}</strong> <span className="muted">· {f.descricao}</span>
                  <div className="pequeno">
                    {f.versao ? <span className="mono muted">{f.versao}</span> : <span className="erro-texto">Não encontrado</span>}
                    {f.mensagem && (
                      <span className={f.mensagem.startsWith('Erro') ? 'erro-texto' : 'ok-texto'} style={{ marginLeft: 10 }}>
                        {f.mensagem}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn" disabled={f.atualizando} onClick={() => window.api.atualizarFerramenta(f.nome)}>
                  {f.atualizando ? <Loader2 className="girando" /> : <RefreshCw />}
                  {f.atualizando ? 'Atualizando…' : 'Atualizar'}
                </button>
              </div>
            )
          })}
        </Secao>

        <Secao titulo="Atualizações">
          <LinhaInterruptor
            rotulo="Atualizar o yt-dlp e o Deno ao abrir o programa"
            dica="Recomendado: o YouTube muda com frequência e versões antigas param de funcionar"
            ligado={c.atualizarFerramentas}
            aoMudar={(atualizarFerramentas) => salvarConfig({ atualizarFerramentas })}
          />
          <Linha rotulo="Canal do yt-dlp" dica="Nightly recebe correções no mesmo dia, mas pode ter bugs novos">
            <Selecao
              valor={c.canalYtdlp}
              aoMudar={(canalYtdlp) => salvarConfig({ canalYtdlp })}
              opcoes={[
                { valor: 'stable', nome: 'Estável' },
                { valor: 'nightly', nome: 'Nightly' }
              ]}
              largura={140}
            />
          </Linha>
        </Secao>

        <p className="muted pequeno">
          As ferramentas ficam em <span className="mono">%APPDATA%\Subaru DL\bin</span>. O yt-dlp acha o Deno, o ffmpeg e o aria2 sozinho.
        </p>
      </div>
    </div>
  )
}
