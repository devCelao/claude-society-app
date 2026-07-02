'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Users, Pencil, Play, ArrowLeft, ImageDown, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { parse } from 'date-fns'
import { toBlob } from 'html-to-image'
import type { TimeFormado, Partida, StatsJogadores } from './DiaDeJogoFlow'
import { PartidaAuditoria } from '@/components/partidas/PartidaAuditoria'

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

const COR_HEX: Record<CorTime, string> = {
  vermelho: '#ef4444',
  azul:     '#3b82f6',
  verde:    '#22c55e',
  laranja:  '#f97316',
}

interface Props {
  diaId: number
  data: string | null
  times: TimeFormado[]
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  partidas: Partida[]
  statsJogadores: StatsJogadores
  onEditarTimes: () => Promise<void>
  onIniciado?: () => void
}

function formatData(iso: string) {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDENTE:     { background: 'rgba(245,196,0,0.1)',    color: '#f5c400', border: '1px solid rgba(245,196,0,0.2)' },
  EM_ANDAMENTO: { background: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' },
  FINALIZADO:   { background: 'rgba(74,222,128,0.1)',   color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' },
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:     'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO:   'Finalizado',
}

export function DiaDeJogoMain({ diaId, data, times, status, partidas, statsJogadores, onEditarTimes, onIniciado }: Props) {
  const router = useRouter()
  const [iniciando, setIniciando] = useState(false)
  const [modoAuditoria, setModoAuditoria] = useState(false)
  const [gerandoImagem, setGerandoImagem] = useState(false)
  const capturaRef = useRef<HTMLDivElement>(null)

  const totalJogadores = times.reduce((s, t) => s + t.jogadores.length, 0)
  const finalizadas = partidas.filter((p) => p.status === 'FINALIZADA')

  async function handleIniciar() {
    setIniciando(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/iniciar`, {
        method: 'POST',
      })
      const body = await res.json()

      if (!res.ok) {
        if (body.error === 'Confronto ja iniciado') {
          onIniciado?.()
          return
        }
        toast.error(body.error ?? 'Erro ao iniciar confronto')
        return
      }

      toast.success(`Confronto iniciado! Ciclo: ${body.cicloNome}`)
      onIniciado?.()
    } finally {
      setIniciando(false)
    }
  }

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
      const nomeArquivo = `confronto-${data ?? diaId}.png`
      const file = new File([blob], nomeArquivo, { type: 'image/png' })

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Confronto' })
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
    <>
    {/* ── Print / captura de imagem ──────────────────────────────────────────── */}
    {/* O wrapper carrega o posicionamento fora da tela; o nó capturado em si
        (capturaRef) fica sempre position:static — ver CicloRanking.tsx para
        o motivo (html-to-image clona o "position:fixed" do próprio nó
        capturado, deslocando o conteúdo pra fora da imagem gerada). */}
    <div
      className={gerandoImagem ? 'block' : 'hidden print:block'}
      style={gerandoImagem ? { position: 'fixed', top: 0, left: -9999 } : undefined}
    >
      <div ref={capturaRef} style={{ fontFamily: 'sans-serif', color: '#000', background: '#fff', padding: 16, width: 720 }}>
        {/* Título */}
        <div style={{ marginBottom: 20, borderBottom: '3px solid #f5c400', paddingBottom: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
            {data ? formatData(data) : 'Confronto'}
          </h1>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            {' às '}
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Times — 3 colunas de largura fixa (evitar grid/fr: html-to-image
            não resolve bem fração de coluna) — só jogadores, sem stats */}
        <div style={{ display: 'flex' }}>
          {times.map((time) => {
            const hex = COR_HEX[time.cor as CorTime] ?? '#888'
            return (
              <div key={time.nome} style={{ width: 213, marginRight: 16, borderLeft: `3px solid ${hex}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: hex, marginBottom: 6, letterSpacing: 1 }}>
                  {time.nome}
                </div>
                {time.jogadores.map((j) => (
                  <div key={j.id} style={{ fontSize: 12, paddingBottom: 3 }}>
                    {j.nome}{j.convidado ? ' (G)' : ''}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>

    {/* ── Screen view ────────────────────────────────────────────────────────── */}
    <div className="print:hidden space-y-6">
      {/* Header */}
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-widest leading-none capitalize">
          {data ? formatData(data) : 'Aguardando início'}
        </h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {data && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-barlow-condensed text-xs tracking-wide"
              style={STATUS_STYLE[status]}
            >
              {STATUS_LABEL[status]}
            </div>
          )}
          <span className="font-barlow-condensed text-sm text-muted-foreground flex items-center gap-1.5">
            <Users size={13} />
            {totalJogadores} jogadores
          </span>

          {/* PENDENTE: editar + iniciar confronto */}
          {status === 'PENDENTE' && (
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={onEditarTimes}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              >
                <Pencil size={12} />
                Editar
              </button>
              <button
                onClick={handleCopiarImagem}
                disabled={gerandoImagem}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors disabled:opacity-40"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              >
                <ImageDown size={12} className={gerandoImagem ? 'animate-pulse' : ''} />
                {gerandoImagem ? 'Gerando...' : 'Copiar imagem'}
              </button>
              <button
                onClick={() => handleIniciar()}
                disabled={iniciando}
                className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-40"
                style={{ background: '#f5c400', color: '#000' }}
              >
                <Play size={14} fill="#000" />
                {iniciando ? 'Iniciando...' : 'Iniciar Confronto'}
              </button>
            </div>
          )}

          {/* FINALIZADO: auditoria + imprimir + voltar */}
          {status === 'FINALIZADO' && (
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (modoAuditoria) { setModoAuditoria(false); router.refresh() }
                  else setModoAuditoria(true)
                }}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={
                  modoAuditoria
                    ? { borderColor: '#f5c400', color: '#f5c400', background: 'rgba(245,196,0,0.06)' }
                    : { borderColor: '#333', color: '#888', background: 'transparent' }
                }
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f5c400'; e.currentTarget.style.borderColor = '#f5c400' }}
                onMouseLeave={(e) => {
                  if (!modoAuditoria) { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }
                }}
              >
                <ClipboardList size={12} />
                {modoAuditoria ? 'Fechar Auditoria' : 'Auditoria'}
              </button>
              <button
                onClick={handleCopiarImagem}
                disabled={gerandoImagem}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors disabled:opacity-40"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              >
                <ImageDown size={12} className={gerandoImagem ? 'animate-pulse' : ''} />
                {gerandoImagem ? 'Gerando...' : 'Copiar imagem'}
              </button>
              <Link
                href="/dias-de-jogo"
                className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={{ borderColor: '#333', color: '#888' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f0ede0'; (e.currentTarget as HTMLElement).style.borderColor = '#555' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = '#333' }}
              >
                <ArrowLeft size={12} />
                Voltar
              </Link>
            </div>
          )}

          {/* EM_ANDAMENTO: auditoria (se houver partida finalizada) + acesso ao vivo */}
          {status === 'EM_ANDAMENTO' && (
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
              {finalizadas.length > 0 && (
                <button
                  onClick={() => {
                    if (modoAuditoria) { setModoAuditoria(false); router.refresh() }
                    else setModoAuditoria(true)
                  }}
                  className="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                  style={
                    modoAuditoria
                      ? { borderColor: '#f5c400', color: '#f5c400', background: 'rgba(245,196,0,0.06)' }
                      : { borderColor: '#333', color: '#888', background: 'transparent' }
                  }
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f5c400'; e.currentTarget.style.borderColor = '#f5c400' }}
                  onMouseLeave={(e) => {
                    if (!modoAuditoria) { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }
                  }}
                >
                  <ClipboardList size={12} />
                  {modoAuditoria ? 'Fechar Auditoria' : 'Auditoria'}
                </button>
              )}
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}
              >
                <Play size={14} fill="#000" />
                Ir para Ao Vivo
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {times.map((time, idx) => {
          const hex = COR_HEX[time.cor as CorTime]
          return (
            <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: `${hex}40`, background: '#111111' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${hex}18`, borderBottom: `1px solid ${hex}30` }}>
                <span className="font-bebas tracking-widest text-xl" style={{ color: hex }}>{time.nome}</span>
                <div className="flex items-center gap-1.5 font-barlow-condensed text-xs" style={{ color: hex }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: hex }} />
                  <span className="capitalize">{time.cor}</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                {time.jogadores.map((j) => (
                  <div key={j.id} className="flex items-center gap-2 px-3 py-2 rounded-lg font-barlow-condensed text-sm" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: hex }} />
                    <span className="flex-1 text-foreground">{j.nome}</span>
                    {(statsJogadores[j.id]?.gols > 0) && (
                      <span className="font-barlow-condensed text-xs font-semibold tabular-nums" style={{ color: '#f5c400' }}>
                        {statsJogadores[j.id].gols}⚽
                      </span>
                    )}
                    {(statsJogadores[j.id]?.assists > 0) && (
                      <span className="font-barlow-condensed text-xs font-semibold tabular-nums" style={{ color: '#3b82f6' }}>
                        {statsJogadores[j.id].assists}🎯
                      </span>
                    )}
                    {j.convidado && (
                      <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>G</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3 font-barlow-condensed text-xs text-muted-foreground">
                {time.jogadores.length} jogadores
              </div>
            </div>
          )
        })}
      </div>

      {/* Partidas */}
      <div>
        <h2 className="font-bebas text-2xl tracking-widest mb-3" style={{ color: '#f5c400' }}>PARTIDAS</h2>
        {(() => {
          if (finalizadas.length === 0) {
            return (
              <div className="rounded-xl border p-8 text-center font-barlow-condensed text-sm text-muted-foreground" style={{ borderColor: '#242424', borderStyle: 'dashed' }}>
                Nenhuma partida realizada
              </div>
            )
          }
          return (
            <div className="space-y-2">
              {finalizadas.map((p, i) => {
                const hexA = COR_HEX[p.timeACor as CorTime] ?? '#888'
                const hexB = COR_HEX[p.timeBCor as CorTime] ?? '#888'
                const vencedorNome = p.vencedorId === p.timeAId
                  ? p.timeANome
                  : p.vencedorId === p.timeBId
                    ? p.timeBNome
                    : null
                const vencedorHex = p.vencedorId === p.timeAId ? hexA : p.vencedorId === p.timeBId ? hexB : '#555'
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl font-barlow-condensed text-sm" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <span className="text-muted-foreground text-xs w-5 flex-shrink-0">P{i + 1}</span>
                    <span className="font-semibold truncate" style={{ color: hexA }}>{p.timeANome}</span>
                    <span className="font-bebas text-lg tabular-nums tracking-widest flex-shrink-0">{p.golsA}×{p.golsB}</span>
                    <span className="font-semibold truncate" style={{ color: hexB }}>{p.timeBNome}</span>
                    <span className="ml-auto text-xs flex-shrink-0" style={{ color: vencedorHex }}>
                      {vencedorNome ? `✓ ${vencedorNome}` : 'empate'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Auditoria — visível quando modoAuditoria ativo (dia FINALIZADO ou EM_ANDAMENTO com alguma partida já finalizada) */}
      {modoAuditoria && (
        <div className="space-y-3">
          <h2 className="font-bebas text-2xl tracking-widest" style={{ color: '#fb923c' }}>AUDITORIA</h2>
          {finalizadas.length === 0 && (
            <div className="rounded-xl border p-6 text-center font-barlow-condensed text-sm text-muted-foreground" style={{ borderColor: '#242424', borderStyle: 'dashed' }}>
              Nenhuma partida para auditar
            </div>
          )}
          {finalizadas.map((p) => (
            <PartidaAuditoria key={p.id} diaId={diaId} partida={p} times={times} />
          ))}
        </div>
      )}
    </div>
    </>
  )
}
