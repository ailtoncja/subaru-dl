import { Copy, Database, Download, FileDown, FolderOpen, Loader2, Search, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CAMPOS_DADOS, CAMPOS_PADRAO, detectarFonte, valorCampo } from '@shared/dados'
import type { CampoDados, FonteDados, FormatoExportacao, LinhaDados, OpcoesInfo } from '@shared/tipos'
import { Etiquetas, Linha, LinhaInterruptor, Segmentado, Selecao } from '../componentes/ui'
import { adicionarLinks, avisar, useEstado } from '../estado'

export default function Dados() {
  const [aba, setAba] = useState<'exportar' | 'info'>('exportar')
  return (
    <>
      <div className="cabecalho">
        <h1>Dados</h1>
        <Segmentado
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'exportar', nome: 'Exportar lista' },
            { valor: 'info', nome: 'Baixar só informações' }
          ]}
        />
      </div>
      <div className="pagina">{aba === 'exportar' ? <ExportarLista /> : <SomenteInformacoes />}</div>
    </>
  )
}

const NOMES_FONTE: Record<FonteDados, string> = {
  auto: 'Automático',
  playlist: 'Playlist',
  canal: 'Canal',
  busca: 'Busca no YouTube',
  links: 'Lista de links'
}

const FORMATOS: Array<{ valor: FormatoExportacao; nome: string }> = [
  { valor: 'xlsx', nome: 'Excel' },
  { valor: 'csv', nome: 'CSV' },
  { valor: 'json', nome: 'JSON' },
  { valor: 'md', nome: 'Markdown' },
  { valor: 'html', nome: 'HTML' },
  { valor: 'txt', nome: 'TXT (só links)' }
]

const GRUPOS = ['Básico', 'Tempo', 'Engajamento', 'Conteúdo'] as const

/** Lê os dados de playlists, canais, buscas ou listas de links e exporta (item 73). */
function ExportarLista() {
  const [fonte, setFonte] = useState<FonteDados>('auto')
  const [entrada, setEntrada] = useState('')
  const [limite, setLimite] = useState(100)
  const [detalhado, setDetalhado] = useState(false)
  const [linhas, setLinhas] = useState<LinhaDados[]>([])
  const [carregando, setCarregando] = useState(false)
  const [lidos, setLidos] = useState(0)
  const [erro, setErro] = useState('')
  const [campos, setCampos] = useState<CampoDados[]>(CAMPOS_PADRAO)
  const [formato, setFormato] = useState<FormatoExportacao>('xlsx')
  const [filtro, setFiltro] = useState('')
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())

  useEffect(() => window.api.aoProgressoDados(setLidos), [])

  const detectada = fonte === 'auto' && entrada.trim() ? detectarFonte(entrada) : null
  const multiplas = fonte === 'links' || detectada === 'links' || entrada.includes('\n')

  const ler = async () => {
    if (!entrada.trim()) return
    setCarregando(true)
    setErro('')
    setLidos(0)
    try {
      const r = await window.api.lerDados(fonte, entrada, limite, detalhado)
      setLinhas(r)
      setMarcadas(new Set(r.map((l, i) => l.id || String(i))))
    } catch (e) {
      setErro(e instanceof Error ? e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '') : String(e))
    } finally {
      setCarregando(false)
    }
  }

  const chave = (l: LinhaDados, i: number) => l.id || String(i)
  const visiveis = useMemo(() => {
    const termo = filtro.trim().toLowerCase()
    return linhas.map((l, i) => ({ l, k: chave(l, i) })).filter(({ l }) => !termo || `${l.titulo} ${l.canal ?? ''}`.toLowerCase().includes(termo))
  }, [linhas, filtro])
  const escolhidas = linhas.filter((l, i) => marcadas.has(chave(l, i)))

  const exportar = async () => {
    if (!escolhidas.length) return avisar('Marque pelo menos uma linha', 'erro')
    const caminho = await window.api.exportarDados(escolhidas, formato === 'txt' ? ['url'] : campos, formato)
    if (caminho) avisar('Exportado')
  }

  return (
    <>
      <div className="entrada">
        <div className="topo">
          <Segmentado valor={fonte} aoMudar={setFonte} opcoes={(Object.keys(NOMES_FONTE) as FonteDados[]).map((f) => ({ valor: f, nome: NOMES_FONTE[f] }))} />
          {detectada && <span className="muted pequeno">Detectado: {NOMES_FONTE[detectada]}</span>}
        </div>
        {multiplas ? (
          <textarea value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Um link por linha" />
        ) : (
          <div className="caixa-link">
            {fonte === 'busca' ? <Search /> : <Database />}
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ler()}
              placeholder={fonte === 'busca' ? 'Palavras para buscar no YouTube' : 'Link da playlist ou do canal (ou palavras para buscar)'}
            />
          </div>
        )}
        <div className="rapidas">
          <div className="grupo">
            Limite
            <Selecao
              valor={limite}
              aoMudar={setLimite}
              opcoes={[
                { valor: 50, nome: '50 itens' },
                { valor: 100, nome: '100 itens' },
                { valor: 500, nome: '500 itens' },
                { valor: 1000, nome: '1000 itens' },
                { valor: 0, nome: 'Sem limite' }
              ]}
            />
          </div>
          <div className="grupo" title="O modo detalhado abre cada vídeo: traz curtidas, comentários, descrição e tags, mas é bem mais lento">
            <Segmentado
              valor={detalhado ? 'detalhado' : 'rapido'}
              aoMudar={(v) => setDetalhado(v === 'detalhado')}
              opcoes={[
                { valor: 'rapido', nome: 'Rápido' },
                { valor: 'detalhado', nome: 'Detalhado' }
              ]}
            />
          </div>
          <div className="flex-1" />
          <button className="btn primario" disabled={carregando || !entrada.trim()} onClick={ler}>
            {carregando ? <Loader2 className="girando" /> : <Database />}
            {carregando ? (lidos ? `${lidos} lidos…` : 'Lendo…') : 'Ler dados'}
          </button>
        </div>
        <p className="muted pequeno" style={{ marginBottom: 0 }}>
          {detalhado
            ? 'O modo detalhado abre cada vídeo para trazer data, curtidas, comentários, descrição e tags. Uma playlist grande pode levar vários minutos.'
            : 'O modo rápido lê a lista de uma vez (título, link, duração, visualizações). Data, curtidas e descrição só vêm no modo detalhado.'}
        </p>
      </div>

      {erro && <p className="erro-texto selecionavel">{erro}</p>}

      {linhas.length > 0 ? (
        <>
          <div className="secao" style={{ marginTop: 16 }}>
            <h3 className="rotulo-secao">Campos</h3>
            <div className="cartao">
              {GRUPOS.map((g) => (
                <Linha key={g} rotulo={g}>
                  <div className="chips" style={{ justifyContent: 'flex-end' }}>
                    {(Object.keys(CAMPOS_DADOS) as CampoDados[])
                      .filter((c) => CAMPOS_DADOS[c].grupo === g)
                      .map((c) => {
                        const ativo = campos.includes(c)
                        return (
                          <button key={c} className={`chip${ativo ? ' ativo' : ''}`} onClick={() => setCampos(ativo ? campos.filter((x) => x !== c) : [...campos, c])}>
                            {CAMPOS_DADOS[c].nome}
                          </button>
                        )
                      })}
                  </div>
                </Linha>
              ))}
            </div>
          </div>

          <div className="barra-fila">
            <h2>
              {escolhidas.length} de {linhas.length} linhas
            </h2>
            <div className="caixa-busca" style={{ width: 240 }}>
              <Search width={15} className="muted" />
              <input placeholder="Filtrar linhas…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>
            <div className="flex-1" />
            <button
              className="btn fantasma"
              onClick={async () => {
                await window.api.copiar(escolhidas.map((l) => l.url).join('\n'))
                avisar(`${escolhidas.length} links copiados`)
              }}
            >
              <Copy /> Copiar links
            </button>
            <button
              className="btn"
              onClick={async () => {
                const n = await adicionarLinks(escolhidas.map((l) => l.url))
                if (n) {
                  avisar(`${n} links enviados para Downloads`)
                  useEstado.getState().ir('downloads')
                }
              }}
            >
              <Send /> Enviar para Downloads
            </button>
            <Selecao valor={formato} aoMudar={setFormato} opcoes={FORMATOS} />
            <button className="btn amarelo" onClick={exportar}>
              <FileDown /> Exportar
            </button>
          </div>

          <div className="rolagem" style={{ maxHeight: 'none' }}>
            <table className="tabela-formatos">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={escolhidas.length === linhas.length}
                      onChange={(e) => setMarcadas(e.target.checked ? new Set(linhas.map(chave)) : new Set())}
                    />
                  </th>
                  <th style={{ width: 40 }}>#</th>
                  {campos.map((c) => (
                    <th key={c}>{CAMPOS_DADOS[c].nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.slice(0, 500).map(({ l, k }, i) => (
                  <tr
                    key={k}
                    className="selecionavel-linha"
                    onClick={() =>
                      setMarcadas((m) => {
                        const n = new Set(m)
                        if (n.has(k)) n.delete(k)
                        else n.add(k)
                        return n
                      })
                    }
                  >
                    <td>
                      <input type="checkbox" checked={marcadas.has(k)} readOnly />
                    </td>
                    <td className="muted">{i + 1}</td>
                    {campos.map((c) => (
                      <td key={c} className={c === 'url' || c === 'id' ? 'mono' : ''} style={{ maxWidth: c === 'descricao' ? 320 : 380 }}>
                        <div className="truncar">{String(valorCampo(l, c))}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visiveis.length > 500 && <p className="muted pequeno">Mostrando 500 de {visiveis.length} na tela. Todas as marcadas entram na exportação.</p>}
        </>
      ) : (
        !carregando && (
          <div className="vazio">
            <Database />
            <strong>Exporte listas de vídeos</strong>
            <span>Cole o link de uma playlist ou canal, faça uma busca ou cole vários links. Depois escolha os campos e exporte para Excel, CSV, JSON e outros.</span>
          </div>
        )
      )}
    </>
  )
}

/** Baixa informação, descrição, comentários, miniatura e legendas, sem o vídeo (item 72). */
function SomenteInformacoes() {
  const config = useEstado((s) => s.config)!
  const [texto, setTexto] = useState('')
  const [pasta, setPasta] = useState(config.pastaVideo)
  const [opcoes, setOpcoes] = useState<OpcoesInfo>({
    json: true,
    descricao: true,
    comentarios: false,
    miniatura: true,
    legendas: false,
    idiomasLegenda: ['pt', 'en']
  })
  const mudar = (p: Partial<OpcoesInfo>) => setOpcoes({ ...opcoes, ...p })
  const links = texto.match(/https?:\/\/[^\s"'<>]+/gi) ?? []
  const algum = opcoes.json || opcoes.descricao || opcoes.comentarios || opcoes.miniatura || opcoes.legendas

  const adicionar = async () => {
    if (!links.length) return avisar('Cole pelo menos um link', 'erro')
    const n = await adicionarLinks(links, true, { somenteInfo: opcoes, pasta })
    if (n) {
      setTexto('')
      avisar(`${n} link(s) na fila. Acompanhe em Downloads.`)
    }
  }

  return (
    <>
      <div className="entrada">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Links de vídeos, playlists ou canais (um por linha)'} />
      </div>
      <div className="secao" style={{ marginTop: 16 }}>
        <h3 className="rotulo-secao">O que baixar</h3>
        <div className="cartao">
          <LinhaInterruptor rotulo="Informações completas (.info.json)" dica="Título, views, curtidas, data, formatos… tudo o que o site informa" ligado={opcoes.json} aoMudar={(json) => mudar({ json })} />
          <LinhaInterruptor rotulo="Descrição (.description)" ligado={opcoes.descricao} aoMudar={(descricao) => mudar({ descricao })} />
          <LinhaInterruptor
            rotulo="Comentários"
            dica="Ficam dentro do .info.json. Pode demorar bastante em vídeos com muitos comentários."
            ligado={opcoes.comentarios}
            aoMudar={(comentarios) => mudar({ comentarios })}
          />
          <LinhaInterruptor rotulo="Miniatura (.jpg)" ligado={opcoes.miniatura} aoMudar={(miniatura) => mudar({ miniatura })} />
          <LinhaInterruptor rotulo="Legendas" dica="Do criador e automáticas" ligado={opcoes.legendas} aoMudar={(legendas) => mudar({ legendas })} />
          {opcoes.legendas && (
            <Linha rotulo="Idiomas das legendas" dica="Vazio = todas" coluna>
              <Etiquetas valores={opcoes.idiomasLegenda} aoMudar={(idiomasLegenda) => mudar({ idiomasLegenda })} placeholder="pt, en…" />
            </Linha>
          )}
          <Linha rotulo="Salvar em" dica={pasta}>
            <button className="btn pequeno fantasma" onClick={() => window.api.abrirPasta(pasta)}>
              <FolderOpen /> Abrir
            </button>
            <button
              className="btn pequeno"
              onClick={async () => {
                const p = await window.api.escolherPasta(pasta)
                if (p) setPasta(p)
              }}
            >
              Escolher…
            </button>
          </Linha>
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end' }}>
        <span className="muted pequeno flex-1">{links.length ? `${links.length} link(s)` : ''}</span>
        <button className="btn primario" disabled={!links.length || !algum} onClick={adicionar}>
          <Download /> Baixar informações
        </button>
      </div>
    </>
  )
}
