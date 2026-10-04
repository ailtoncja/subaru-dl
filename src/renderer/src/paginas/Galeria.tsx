import { CheckCircle2, Clock, FolderOpen, Images, Link2, Loader2, Pause, Play, RotateCw, Trash2, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import { tempoRelativo } from '@shared/formatar'
import type { ItemGaleria, StatusGaleria } from '@shared/tipos'
import { Segmentado } from '../componentes/ui'
import { avisar, salvarConfig, useEstado } from '../estado'

const NOMES: Record<StatusGaleria, string> = {
  aguardando: 'Na fila',
  baixando: 'Baixando',
  pausado: 'Pausado',
  concluido: 'Concluído',
  erro: 'Erro'
}

const SITES = ['Instagram', 'X/Twitter', 'Pixiv', 'DeviantArt', 'Reddit', 'Tumblr', 'Pinterest', 'ArtStation', 'Danbooru', 'MangaDex', 'Imgur', 'Bluesky', 'Kemono']

/** Galeria de imagens e coleções com o gallery-dl (item 74). */
export default function Galeria() {
  const { galeria, config } = useEstado()
  const [multiplos, setMultiplos] = useState(false)
  const [texto, setTexto] = useState('')
  const c = config!
  const links = texto.match(/https?:\/\/[^\s"'<>]+/gi) ?? []

  const adicionar = async () => {
    if (!links.length) return avisar('Cole pelo menos um link', 'erro')
    const n = await window.api.adicionarGaleria(links)
    if (n) {
      setTexto('')
      avisar(n === 1 ? 'Começou a baixar' : `${n} links na fila`)
    }
  }

  return (
    <>
      <div className="cabecalho">
        <h1>Galeria</h1>
        <button className="btn fantasma" onClick={() => window.api.abrirPasta(c.pastaGaleria)}>
          <FolderOpen /> Abrir pasta
        </button>
      </div>
      <div className="pagina">
        <div className="entrada">
          <div className="topo">
            <Segmentado
              valor={multiplos ? 'varios' : 'um'}
              aoMudar={(v) => setMultiplos(v === 'varios')}
              opcoes={[
                { valor: 'um', nome: 'Um link' },
                { valor: 'varios', nome: 'Vários links' }
              ]}
            />
            <span className="muted pequeno flex-1" style={{ textAlign: 'right' }}>
              Perfis, posts, álbuns e capítulos de mangá em centenas de sites
            </span>
          </div>
          {multiplos ? (
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Um link por linha" />
          ) : (
            <div className="caixa-link">
              <Link2 />
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionar()}
                placeholder="Cole o link de um perfil, post, álbum ou galeria"
              />
              {texto && (
                <button className="icone-btn" onClick={() => setTexto('')}>
                  <X />
                </button>
              )}
            </div>
          )}
          <div className="rapidas">
            <button
              className="btn fantasma pequeno"
              title={c.pastaGaleria}
              onClick={async () => {
                const p = await window.api.escolherPasta(c.pastaGaleria)
                if (p) void salvarConfig({ pastaGaleria: p })
              }}
            >
              <FolderOpen />
              <span className="truncar" style={{ maxWidth: 260 }}>
                {c.pastaGaleria.split(/[\\/]/).slice(-2).join('\\')}
              </span>
            </button>
            <label className="grupo" style={{ cursor: 'pointer' }} title="Guarda o que já foi baixado e não baixa de novo, mesmo se você apagar o arquivo">
              <input type="checkbox" checked={c.galeriaPularBaixados} onChange={(e) => salvarConfig({ galeriaPularBaixados: e.target.checked })} />
              Pular o que já baixei
            </label>
            <div className="grupo" title='Quais arquivos baixar, ex.: "1-50" (os 50 primeiros) ou "10-" (do 10º em diante)'>
              Arquivos
              <input
                className="campo"
                style={{ width: 90, padding: '3px 8px' }}
                placeholder="todos"
                defaultValue={c.galeriaIntervalo}
                onBlur={(e) => e.target.value !== c.galeriaIntervalo && salvarConfig({ galeriaIntervalo: e.target.value.trim() })}
              />
            </div>
            <div className="flex-1" />
            <button className="btn primario" disabled={!links.length} onClick={adicionar}>
              <Images /> Baixar
            </button>
          </div>
        </div>

        {(c.cookies.origem === 'nenhum') && (
          <div className="aviso-caixa info-caixa" style={{ marginTop: 12 }}>
            <Images />
            <span>
              Instagram, X/Twitter e Pixiv costumam exigir login. Ative os cookies do navegador em Configurações → Rede e login; a galeria usa os mesmos cookies dos vídeos.
            </span>
          </div>
        )}

        <div className="barra-fila">
          <h2>Downloads da galeria</h2>
          <div className="flex-1" />
          {galeria.some((i) => i.status === 'concluido') && (
            <button className="btn fantasma" onClick={() => window.api.limparGaleriaConcluidos()}>
              <Trash2 /> Limpar concluídos
            </button>
          )}
        </div>

        {galeria.length ? (
          <div className="lista-fila">
            {[...galeria].reverse().map((i) => (
              <ItemDaGaleria key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <div className="vazio">
            <Images />
            <strong>Nenhuma galeria ainda</strong>
            <span>Funciona com {SITES.join(', ')} e muitos outros.</span>
          </div>
        )}
      </div>
    </>
  )
}

function IconeStatus({ status }: { status: StatusGaleria }) {
  if (status === 'baixando') return <Loader2 className="girando" />
  if (status === 'concluido') return <CheckCircle2 />
  if (status === 'erro') return <XCircle />
  if (status === 'pausado') return <Pause />
  return <Clock />
}

function ItemDaGaleria({ item }: { item: ItemGaleria }) {
  const api = window.api
  const estado = item.status === 'aguardando' ? 'pronto' : item.status
  return (
    <div className="item">
      <div className="principal">
        <div className="miniatura" style={{ width: 64, height: 64 }}>
          <div className="vazia">{item.status === 'baixando' ? <Loader2 className="girando" /> : <Images />}</div>
        </div>
        <div className="corpo">
          <div className="titulo selecionavel" title={item.url}>
            {item.url}
          </div>
          <div className="status">
            <span className={`estado ${estado}`}>
              <IconeStatus status={item.status} />
              {NOMES[item.status]}
            </span>
            <span>
              {item.arquivos} arquivo(s) baixado(s)
              {item.pulados > 0 && ` · ${item.pulados} já existiam`}
              {item.falhas > 0 && <span className="erro-texto"> · {item.falhas} falharam</span>}
              {item.concluidoEm && ` · ${tempoRelativo(item.concluidoEm)}`}
            </span>
          </div>
          {item.ultimoArquivo && (
            <div className="muted pequeno truncar mono" title={item.ultimoArquivo}>
              {item.ultimoArquivo}
            </div>
          )}
        </div>
        <div className="acoes">
          {item.status === 'baixando' || item.status === 'aguardando' ? (
            <button className="icone-btn" title="Pausar" onClick={() => api.pausarGaleria(item.id)}>
              <Pause />
            </button>
          ) : (
            <button className="icone-btn amarelo" title={item.status === 'pausado' ? 'Continuar' : 'Baixar de novo (pula o que já existe)'} onClick={() => api.retomarGaleria(item.id)}>
              {item.status === 'pausado' ? <Play /> : <RotateCw />}
            </button>
          )}
          <button
            className="icone-btn"
            title="Abrir a pasta"
            onClick={() => (item.ultimoArquivo ? api.mostrarNaPasta(item.ultimoArquivo) : api.abrirPasta(item.pasta))}
          >
            <FolderOpen />
          </button>
          <button className="icone-btn" title="Remover da lista" onClick={() => api.removerGaleria([item.id])}>
            <Trash2 />
          </button>
        </div>
      </div>
      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : ''} style={item.status !== 'erro' ? { color: 'var(--aviso)' } : undefined}>
            {item.erro}
          </div>
          {item.dicaErro && <div className="dica">{item.dicaErro}</div>}
        </div>
      )}
    </div>
  )
}
