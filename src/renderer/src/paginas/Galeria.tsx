// Galeria: imagens, perfis, álbuns e mangás com o gallery-dl (item 74).
import { CheckCircle2, ClipboardPaste, Clock, FolderOpen, Images, Info, Link2, Loader2, Pause, Play, RotateCw, Trash2, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import { tempoRelativo } from '@shared/formatar'
import type { ItemGaleria, OrganizarGaleria, StatusGaleria } from '@shared/tipos'
import { pastaCurta } from '../componentes/Destino'
import { avisar, extrairLinks, salvarConfig, useEstado } from '../estado'

const NOMES: Record<StatusGaleria, string> = {
  aguardando: 'Na fila',
  baixando: 'Baixando',
  pausado: 'Pausado',
  concluido: 'Concluído',
  erro: 'Erro'
}

const SITES = 'Instagram, X/Twitter, Pixiv, DeviantArt, Reddit, Tumblr, Pinterest, ArtStation, Bluesky, MangaDex, Imgur e muitos outros'

export default function Galeria() {
  const { galeria, config } = useEstado()
  const c = config!
  const [texto, setTexto] = useState('')
  // Pasta e organização escolhidas para os próximos links (null = as das configurações)
  const [pasta, setPasta] = useState<string | null>(null)
  const [organizar, setOrganizar] = useState<OrganizarGaleria>(c.galeriaOrganizar)
  const links = [...new Set(extrairLinks(texto))]
  const destino = pasta ?? c.pastaGaleria

  const adicionar = async () => {
    if (!links.length) return avisar('Cole pelo menos um link', 'erro')
    const n = await window.api.adicionarGaleria(links, pasta, organizar)
    if (n) {
      setTexto('')
      avisar(n === 1 ? 'Começou a baixar' : `${n} links na fila`)
    }
  }

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>
          Galeria <span className="sub">perfis, posts, álbuns e capítulos de mangá</span>
        </h1>
        <button className="btn" onClick={() => window.api.abrirPasta(c.pastaGaleria)}>
          <FolderOpen className="amarelo" /> Abrir pasta
        </button>
      </div>

      <div className="cartao caixa-url">
        {links.length > 1 || texto.includes('\n') ? (
          <textarea className="mono" value={texto} onChange={(e) => setTexto(e.target.value)} />
        ) : (
          <div className="linha-url">
            <Link2 />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              placeholder="Cole o link de um perfil, post, álbum ou galeria"
            />
            {texto && (
              <button className="icone-btn leve" onClick={() => setTexto('')}>
                <X />
              </button>
            )}
            <button
              className="btn"
              onClick={async () => {
                const achados = extrairLinks(await window.api.lerClipboard())
                if (achados.length) setTexto(achados.join('\n'))
                else avisar('Nenhum link na área de transferência', 'erro')
              }}
            >
              <ClipboardPaste className="amarelo" /> Colar
            </button>
            <button className="btn primario grande" disabled={!links.length} onClick={adicionar}>
              <Images /> Baixar
            </button>
          </div>
        )}

        <div className="rodape-previa" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginTop: 12, font: '12.5px var(--mono)', color: 'var(--muted)' }}>
          <span className="flex" style={{ gap: 8 }} title={destino}>
            <FolderOpen width={16} />
            Salvar em: <span style={{ color: 'var(--texto)' }}>{pastaCurta(destino)}</span>
            <button
              className="link-amarelo mono pequeno"
              onClick={async () => {
                const nova = await window.api.escolherPasta(destino)
                if (nova) setPasta(nova)
              }}
            >
              Alterar
            </button>
            {pasta && (
              <button className="link-amarelo mono pequeno" style={{ color: 'var(--muted)' }} onClick={() => setPasta(null)}>
                Padrão
              </button>
            )}
          </span>
          <select className="mono" style={{ padding: '4px 30px 4px 8px', fontSize: 12.5 }} value={organizar} onChange={(e) => setOrganizar(e.target.value as OrganizarGaleria)}>
            <option value="padrao">Organizar: por site e perfil</option>
            <option value="plana">Organizar: tudo na mesma pasta</option>
          </select>
          <label className="flex" style={{ gap: 8, cursor: 'pointer' }} title="Lembra cada arquivo baixado e não baixa de novo">
            <input type="checkbox" checked={c.galeriaPularBaixados} onChange={(e) => salvarConfig({ galeriaPularBaixados: e.target.checked })} />
            Pular o que já baixei
          </label>
          <span className="flex" style={{ gap: 8 }} title='Ex.: "1-50" para os 50 primeiros'>
            Arquivos:
            <input
              className="campo mono"
              style={{ width: 80, padding: '3px 8px', fontSize: 12.5 }}
              placeholder="todos"
              defaultValue={c.galeriaIntervalo}
              onBlur={(e) => e.target.value !== c.galeriaIntervalo && salvarConfig({ galeriaIntervalo: e.target.value.trim() })}
            />
          </span>
          {links.length > 1 && (
            <button className="btn primario" style={{ marginLeft: 'auto' }} onClick={adicionar}>
              <Images /> Baixar {links.length} links
            </button>
          )}
        </div>
      </div>

      {c.cookies.origem === 'nenhum' && (
        <div className="aviso-azul">
          <Info />
          <span>Instagram, X/Twitter e Pixiv costumam exigir login. Ative os cookies do navegador em Configurações → Rede e login.</span>
        </div>
      )}

      <div className="titulo-secao">
        <Images />
        <h2>Downloads da galeria</h2>
        {galeria.some((i) => i.status === 'concluido') && (
          <button className="btn fantasma pequeno direita" onClick={() => window.api.limparGaleriaConcluidos()}>
            <Trash2 /> Limpar concluídos
          </button>
        )}
      </div>

      {galeria.length ? (
        <div className="lista">
          {[...galeria].reverse().map((i) => (
            <ItemDaGaleria key={i.id} item={i} />
          ))}
        </div>
      ) : (
        <div className="cartao vazio">
          <Images />
          <strong>Nenhuma galeria ainda</strong>
          <span>Funciona com {SITES}.</span>
        </div>
      )}
    </div>
  )
}

function IconeStatus({ status }: { status: StatusGaleria }) {
  if (status === 'baixando') return <Loader2 className="girando" width={15} />
  if (status === 'concluido') return <CheckCircle2 width={15} />
  if (status === 'erro') return <XCircle width={15} />
  if (status === 'pausado') return <Pause width={15} />
  return <Clock width={15} />
}

function ItemDaGaleria({ item }: { item: ItemGaleria }) {
  const api = window.api
  const cor = item.status === 'concluido' ? 'ok' : item.status === 'erro' ? 'erro' : item.status === 'pausado' ? 'aviso' : ''
  return (
    <div className="cartao tarefa">
      <div className="topo">
        <div className="miniatura quadrada">
          <div className="vazia">{item.status === 'baixando' ? <Loader2 className="girando" /> : <Images />}</div>
        </div>
        <div className="texto">
          <div className="nome">
            <strong className="selecionavel mono" style={{ fontSize: 14 }} title={item.url}>
              {item.url}
            </strong>
          </div>
          <div className="origem flex" style={{ gap: 8, fontSize: 13 }}>
            <span className={`estado-texto ${cor} flex`} style={{ gap: 5 }}>
              <IconeStatus status={item.status} /> {NOMES[item.status]}
            </span>
            <span className="muted mono pequeno">
              {item.arquivos} baixado(s)
              {item.pulados > 0 && ` · ${item.pulados} já existiam`}
              {item.falhas > 0 && <span className="erro-texto"> · {item.falhas} falharam</span>}
              {item.concluidoEm && ` · ${tempoRelativo(item.concluidoEm)}`}
              {' · '}
              {pastaCurta(item.pasta)}
              {item.organizar === 'plana' ? ' (sem subpastas)' : ''}
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
          <button className="icone-btn" title="Abrir a pasta" onClick={() => (item.ultimoArquivo ? api.mostrarNaPasta(item.ultimoArquivo) : api.abrirPasta(item.pasta))}>
            <FolderOpen />
          </button>
          <button className="icone-btn" title="Remover da lista" onClick={() => api.removerGaleria([item.id])}>
            <X />
          </button>
        </div>
      </div>
      {item.status === 'baixando' && (
        <div className="barra-progresso indeterminado" style={{ marginTop: 14 }}>
          <div />
        </div>
      )}
      {item.erro && (
        <div className="erro-msg selecionavel">
          <div className={item.status === 'erro' ? 'erro-texto' : 'estado-texto aviso'}>{item.erro}</div>
          {item.dicaErro && <div className="dica">{item.dicaErro}</div>}
        </div>
      )}
    </div>
  )
}
