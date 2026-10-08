'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ImageDown, FlagTriangleRight, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { toBlob } from 'html-to-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { StatJogador, CicloStats } from '@/app/api/ciclos/[id]/route'

type CicloResumo = { id: number; nome: string; inicioEm: string; fimEm: string | null }

interface Props {
  ciclos: CicloResumo[]
  cicloIdInicial: number
}

function TabelaRanking({
  titulo,
  colunaValor,
  dados,
}: {
  titulo: string
  colunaValor: string
  dados: StatJogador[]
}) {
  return (
    <div className="ranking-table">
      <h2
        className="font-bebas tracking-widest text-xl text-center mb-3 pb-2"
        style={{ borderBottom: '2px solid #f5c400', color: '#f5c400' }}
      >
        {titulo}
      </h2>
      <table className="w-full text-sm font-barlow-condensed">
        <thead>
          <tr className="text-muted-foreground text-xs tracking-widest uppercase">
            <th className="text-left py-1.5 w-6">#</th>
            <th className="text-left py-1.5">Nome</th>
            <th className="text-center py-1.5 w-10">{colunaValor}</th>
            <th className="text-center py-1.5 w-8">V</th>
            <th className="text-center py-1.5 w-8">E</th>
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                Sem dados neste ciclo
              </td>
            </tr>
          )}
          {dados.map((item, idx) => (
            <tr
              key={item.nome}
              className="border-b transition-colors"
              style={{
                borderColor: '#1a1a1a',
                background: idx === 0 ? 'rgba(245,196,0,0.06)' : 'transparent',
              }}
            >
              <td className="py-2 text-muted-foreground">{item.posicao}º</td>
              <td className="py-2 font-semibold" style={{ color: idx === 0 ? '#f5c400' : '#f0ede0' }}>
                {item.nome}
              </td>
              <td className="py-2 text-center font-bold" style={{ color: idx === 0 ? '#f5c400' : '#f0ede0' }}>
                {item.valor}
              </td>
              <td className="py-2 text-center text-muted-foreground">{item.vitorias}</td>
              <td className="py-2 text-center text-muted-foreground">{item.empates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatMesAno(ciclo: CicloResumo): string {
  const inicio = new Date(ciclo.inicioEm)
  const mes = String(inicio.getMonth() + 1).padStart(2, '0')
  const ano = inicio.getFullYear()
  return `${mes}/${ano}`
}

function formatPeriodo(ciclo: CicloResumo): string {
  const inicio = new Date(ciclo.inicioEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fim = ciclo.fimEm
    ? new Date(ciclo.fimEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'em andamento'
  return `${inicio} – ${fim}`
}

function PrintTabela({ titulo, colunaValor, dados }: { titulo: string; colunaValor: string; dados: StatJogador[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px 0', paddingBottom: 5, borderBottom: '2px solid #f5c400', color: '#000' }}>
        {titulo}
      </h2>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            <th style={{ textAlign: 'left', paddingBottom: 4, width: 20 }}>#</th>
            <th style={{ textAlign: 'left', paddingBottom: 4 }}>Nome</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 32 }}>{colunaValor}</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 28 }}>V</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 28 }}>E</th>
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '12px 0', textAlign: 'center', color: '#999', fontSize: 11 }}>Sem dados</td></tr>
          )}
          {dados.map((item, idx) => (
            <tr key={item.nome} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 0', color: '#999' }}>{item.posicao}º</td>
              <td style={{ padding: '4px 0', fontWeight: idx === 0 ? 700 : 400 }}>{item.nome}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', fontWeight: 700, color: idx === 0 ? '#b08a00' : '#333' }}>{item.valor}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', color: '#666' }}>{item.vitorias}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', color: '#666' }}>{item.empates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CicloRanking({ ciclos, cicloIdInicial }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [cicloId, setCicloId] = useState(cicloIdInicial)
  // Filtro opcional: so confrontos finalizados (persistido na URL como ?finalizados=1)
  const [soFinalizados, setSoFinalizados] = useState(searchParams.get('finalizados') === '1')
  const [stats, setStats] = useState<CicloStats | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [confirmFinalizarOpen, setConfirmFinalizarOpen] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [gerandoImagem, setGerandoImagem] = useState(false)
  const capturaRef = useRef<HTMLDivElement>(null)

  const cicloAtual = ciclos.find((c) => c.id === cicloId)
  const cicloEhAtivo = cicloAtual?.fimEm === null

  const buscarStats = useCallback(async (id: number, finalizados: boolean) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/ciclos/${id}${finalizados ? '?finalizados=1' : ''}`)
      if (res.ok) setStats(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (cicloId > 0) buscarStats(cicloId, soFinalizados)
    else setCarregando(false)
  }, [cicloId, soFinalizados, buscarStats])

  function handleCicloChange(id: number) {
    setCicloId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('cicloId', String(id))
    router.replace(`${pathname}?${params.toString()}`)
  }

  function handleFiltroFinalizados(ativo: boolean) {
    setSoFinalizados(ativo)
    const params = new URLSearchParams(searchParams.toString())
    if (ativo) params.set('finalizados', '1')
    else params.delete('finalizados')
    router.replace(`${pathname}?${params.toString()}`)
  }

  async function handleFinalizar() {
    setFinalizando(true)
    try {
      const res = await fetch(`/api/ciclos/${cicloId}/finalizar`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? 'Erro ao finalizar ciclo')
        return
      }
      toast.success('Ciclo finalizado com sucesso')
      setConfirmFinalizarOpen(false)
      router.refresh()
    } finally {
      setFinalizando(false)
    }
  }

  // Espera o layout do nó de captura (recém-tornado visível) estabilizar
  // antes de fotografar — em vez de um delay fixo, aguarda a altura parar
  // de mudar entre checagens sucessivas (mais robusto a variações de
  // performance do dispositivo/navegador).
  async function esperarLayoutEstabilizar(node: HTMLElement): Promise<void> {
    let alturaAnterior = -1
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const altura = node.scrollHeight
      if (altura > 0 && altura === alturaAnterior) return
      alturaAnterior = altura
    }
  }

  async function capturarImagem(): Promise<Blob> {
    const node = capturaRef.current
    if (!node) throw new Error('Nada para capturar')
    await esperarLayoutEstabilizar(node)
    const blob = await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: node.scrollWidth,
      height: node.scrollHeight,
    })
    if (!blob) throw new Error('Falha ao gerar imagem')
    return blob
  }

  async function handleCopiarImagem() {
    if (!stats || !cicloAtual) return
    setGerandoImagem(true)
    const blobPromise = capturarImagem()

    try {
      const temClipboardImagem =
        typeof navigator !== 'undefined' && 'clipboard' in navigator && typeof window.ClipboardItem !== 'undefined'

      if (temClipboardImagem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
          toast.success('Imagem copiada! Cole (Ctrl+V) onde quiser compartilhar.')
          return
        } catch {
          // navegador tem a API mas recusou (ex.: sem permissão) — cai nos fallbacks abaixo
        }
      }

      const blob = await blobPromise
      const nomeArquivo = `ranking-${cicloAtual.nome.replace(/\s+/g, '-')}.png`
      const file = new File([blob], nomeArquivo, { type: 'image/png' })

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Ranking — ${cicloAtual.nome}` })
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          // segue para o download
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArquivo
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Imagem baixada')
    } catch {
      toast.error('Não foi possível gerar a imagem')
    } finally {
      setGerandoImagem(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Screen view ────────────────────────────────────────────────────────── */}
      {/* Header */}
      <div className="print:hidden"> 
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          Ranking
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          Estatísticas por período — gerados automaticamente ao iniciar confrontos
        </p>
      </div>

      {/* Seletor + print */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {ciclos.length > 0 ? (
          <select
            value={cicloId}
            onChange={(e) => handleCicloChange(Number(e.target.value))}
            className="flex-1 min-w-0 sm:flex-none sm:min-w-[180px] rounded-xl px-4 py-2.5 font-barlow-condensed text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer"
            style={{ background: '#111111', border: '1px solid #242424' }}
          >
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {formatMesAno(c)} {c.fimEm === null ? '- [ATIVO]' : ''}
              </option>
            ))}
          </select>
        ) : (
          <p className="font-barlow-condensed text-sm text-muted-foreground">
            Nenhum ciclo ainda — inicie um confronto para criar o primeiro.
          </p>
        )}

        {ciclos.length > 0 && (
          <button
            onClick={handleCopiarImagem}
            disabled={gerandoImagem || !stats}
            title="Copiar imagem"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
            style={{ background: '#111111', border: '1px solid #242424', color: '#888888' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f5c400'; e.currentTarget.style.borderColor = 'rgba(245,196,0,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; e.currentTarget.style.borderColor = '#242424' }}
          >
            <ImageDown size={17} className={gerandoImagem ? 'animate-pulse' : ''} />
          </button>
        )}

        {ciclos.length > 0 && (
          <button
            onClick={() => handleFiltroFinalizados(!soFinalizados)}
            title={soFinalizados ? 'Mostrar todos os confrontos' : 'Somente confrontos finalizados'}
            aria-label="Filtrar confrontos finalizados"
            aria-pressed={soFinalizados}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors flex-shrink-0"
            style={{
              background: soFinalizados ? 'rgba(245,196,0,0.1)' : '#111111',
              border: `1px solid ${soFinalizados ? 'rgba(245,196,0,0.4)' : '#242424'}`,
              color: soFinalizados ? '#f5c400' : '#888888',
            }}
          >
            <Filter size={16} />
          </button>
        )}

        {cicloEhAtivo && (
          <button
            onClick={() => setConfirmFinalizarOpen(true)}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-3.5 py-2.5 rounded-xl font-barlow-condensed text-sm tracking-wide transition-colors"
            style={{ background: '#1a0e00', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}
          >
            <FlagTriangleRight size={15} />
            Finalizar Ciclo
          </button>
        )}
      </div>

      {soFinalizados && ciclos.length > 0 && (
        <div className="print:hidden -mt-3">
          <button
            onClick={() => handleFiltroFinalizados(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide"
            style={{ background: 'rgba(245,196,0,0.1)', color: '#f5c400', border: '1px solid rgba(245,196,0,0.25)' }}
          >
            Só confrontos finalizados
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tabelas */}
      {ciclos.length === 0 ? null : carregando ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: '#111111' }} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <TabelaRanking titulo="ARTILHARIA" colunaValor="Gols" dados={stats.artilharia} />
          <TabelaRanking titulo="LIDER EM PASSES" colunaValor="Ass" dados={stats.passes} />
          <TabelaRanking titulo="FOTOS" colunaValor="Fotos" dados={stats.fotos} />
        </div>
      ) : (
        <p className="text-muted-foreground font-barlow-condensed text-sm py-10 text-center print:hidden">
          Sem dados para este ciclo
        </p>
      )}

      {/* ── Print / captura de imagem (ao final — não afeta space-y-6 do conteúdo de tela) ───── */}
      {/* O wrapper carrega o posicionamento fora da tela; o nó capturado em
          si (capturaRef) fica sempre position:static — se "fixed"/offset
          negativo estiver no próprio nó capturado, o html-to-image clona
          esse estilo para dentro do SVG gerado e o conteúdo se autodesloca
          para fora da área capturada, resultando numa imagem em branco. */}
      {stats && cicloAtual && (
        <div
          className={gerandoImagem ? 'block' : 'hidden print:block'}
          style={gerandoImagem ? { position: 'fixed', top: 0, left: -9999 } : undefined}
        >
          <div
            ref={capturaRef}
            style={{
              fontFamily: 'sans-serif',
              color: '#000',
              background: '#fff',
              padding: '16px',
              width: 720,
            }}
          >
          <div style={{ marginBottom: 20, borderBottom: '3px solid #f5c400', paddingBottom: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
              {cicloAtual.nome}
            </h1>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {formatPeriodo(cicloAtual)}
              {soFinalizados && ' · Somente confrontos finalizados'}
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 213, marginRight: 24 }}>
              <PrintTabela titulo="Artilharia" colunaValor="Gols" dados={stats.artilharia} />
            </div>
            <div style={{ width: 213, marginRight: 24 }}>
              <PrintTabela titulo="Lider em Passes" colunaValor="Ass" dados={stats.passes} />
            </div>
            <div style={{ width: 213 }}>
              <PrintTabela titulo="Fotos" colunaValor="FOTO" dados={stats.fotos} />
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar finalização do ciclo ativo (screen only) */}
      <Dialog open={confirmFinalizarOpen} onOpenChange={setConfirmFinalizarOpen}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl flex items-center gap-2">
              <FlagTriangleRight size={20} style={{ color: '#fb923c' }} />
              Finalizar ciclo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm leading-relaxed" style={{ color: '#f0ede0' }}>
              {cicloAtual?.nome} será encerrado hoje. Um novo ciclo será criado automaticamente no próximo confronto iniciado.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleFinalizar}
                disabled={finalizando}
                className="font-barlow-condensed tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}
              >
                {finalizando ? 'Finalizando...' : 'Confirmar e finalizar'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmFinalizarOpen(false)} disabled={finalizando} className="font-barlow-condensed">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
