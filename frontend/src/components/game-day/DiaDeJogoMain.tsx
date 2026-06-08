'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Pencil, Play, AlertTriangle, ArrowLeft, Printer, ClipboardList } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

function formatDataBR(iso: string) {
  return format(parse(iso, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
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
  const [confirmSemConfigOpen, setConfirmSemConfigOpen] = useState(false)
  const [dataHoje, setDataHoje] = useState<string | null>(null)
  const [modoAuditoria, setModoAuditoria] = useState(false)

  const totalJogadores = times.reduce((s, t) => s + t.jogadores.length, 0)
  const finalizadas = partidas.filter((p) => p.status === 'FINALIZADA')

  async function handleIniciar(confirmar = false) {
    setIniciando(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmar ? { confirmar: true } : {}),
      })
      const body = await res.json()

      if (res.ok && body.precisaConfirmar) {
        setDataHoje(body.dataInicio)
        setConfirmSemConfigOpen(true)
        return
      }

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

  return (
    <>
    {/* ── Print view ─────────────────────────────────────────────────────────── */}
    <div className="hidden print:block" style={{ fontFamily: 'sans-serif', color: '#000', padding: '0 8px' }}>
      {/* Título */}
      <div style={{ marginBottom: 20, borderBottom: '3px solid #f5c400', paddingBottom: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
          {data ? formatData(data) : 'Confronto'}
        </h1>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          {STATUS_LABEL[status]} · {totalJogadores} jogadores
        </div>
      </div>

      {/* Times — 3 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {times.map((time) => {
          const hex = COR_HEX[time.cor as CorTime] ?? '#888'
          return (
            <div key={time.nome} style={{ borderLeft: `3px solid ${hex}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: hex, marginBottom: 6, letterSpacing: 1 }}>
                {time.nome}
              </div>
              {time.jogadores.map((j) => {
                const g = statsJogadores[j.id]?.gols ?? 0
                const a = statsJogadores[j.id]?.assists ?? 0
                return (
                  <div key={j.id} style={{ fontSize: 12, paddingBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{j.nome}{j.convidado ? ' (G)' : ''}</span>
                    {(g > 0 || a > 0) && (
                      <span style={{ color: '#555', fontSize: 11 }}>
                        {g > 0 ? `${g}⚽` : ''}{g > 0 && a > 0 ? ' ' : ''}{a > 0 ? `${a}🎯` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Partidas */}
      {finalizadas.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 10px 0', paddingBottom: 6, borderBottom: '2px solid #f5c400' }}>
            Partidas
          </h2>
          {finalizadas.map((p, i) => {
            const hexA = COR_HEX[p.timeACor as CorTime] ?? '#888'
            const hexB = COR_HEX[p.timeBCor as CorTime] ?? '#888'
            const vencedorNome = p.vencedorId === p.timeAId ? p.timeANome : p.vencedorId === p.timeBId ? p.timeBNome : null
            const vencedorHex = p.vencedorId === p.timeAId ? hexA : p.vencedorId === p.timeBId ? hexB : '#999'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid #eee', fontSize: 12 }}>
                <span style={{ color: '#999', width: 20, flexShrink: 0 }}>P{i + 1}</span>
                <span style={{ fontWeight: 600, color: hexA }}>{p.timeANome}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{p.golsA}×{p.golsB}</span>
                <span style={{ fontWeight: 600, color: hexB }}>{p.timeBNome}</span>
                <span style={{ marginLeft: 'auto', color: vencedorHex, flexShrink: 0 }}>
                  {vencedorNome ? `✓ ${vencedorNome}` : 'empate'}
                </span>
              </div>
            )
          })}
        </div>
      )}
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
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onEditarTimes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              >
                <Pencil size={12} />
                Editar
              </button>
              <button
                onClick={() => handleIniciar(false)}
                disabled={iniciando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-40"
                style={{ background: '#f5c400', color: '#000' }}
              >
                <Play size={14} fill="#000" />
                {iniciando ? 'Iniciando...' : 'Iniciar Confronto'}
              </button>
            </div>
          )}

          {/* FINALIZADO: auditoria + imprimir + voltar */}
          {status === 'FINALIZADO' && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (modoAuditoria) { setModoAuditoria(false); router.refresh() }
                  else setModoAuditoria(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
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
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
              >
                <Printer size={12} />
                Imprimir
              </button>
              <Link
                href="/dias-de-jogo"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors"
                style={{ borderColor: '#333', color: '#888' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f0ede0'; (e.currentTarget as HTMLElement).style.borderColor = '#555' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = '#333' }}
              >
                <ArrowLeft size={12} />
                Voltar
              </Link>
            </div>
          )}

          {/* EM_ANDAMENTO: acesso direto ao ao vivo */}
          {status === 'EM_ANDAMENTO' && (
            <Link
              href="/dashboard"
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide"
              style={{ background: '#f5c400', color: '#000' }}
            >
              <Play size={14} fill="#000" />
              Ir para Ao Vivo
            </Link>
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

      {/* Auditoria — visível só quando FINALIZADO e modoAuditoria ativo */}
      {modoAuditoria && status === 'FINALIZADO' && (
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

      {/* Modal: sem configuração de datas (screen only) */}
      <Dialog open={confirmSemConfigOpen} onOpenChange={setConfirmSemConfigOpen}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl flex items-center gap-2">
              <AlertTriangle size={20} style={{ color: '#fb923c' }} />
              Sem data de corte configurada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm leading-relaxed" style={{ color: '#f0ede0' }}>
              Nenhuma data de corte foi configurada. O confronto será registrado com:
            </p>
            <div className="rounded-xl p-3 space-y-1" style={{ background: '#1a1200', border: '1px solid rgba(245,196,0,0.2)' }}>
              <div className="font-barlow-condensed text-sm flex justify-between">
                <span className="text-muted-foreground">Início do ciclo:</span>
                <span style={{ color: '#f5c400' }}>{dataHoje ? formatDataBR(dataHoje) : '—'} (hoje)</span>
              </div>
              <div className="font-barlow-condensed text-sm flex justify-between">
                <span className="text-muted-foreground">Fim do ciclo:</span>
                <span className="text-muted-foreground">Sem data de encerramento</span>
              </div>
            </div>
            <p className="font-barlow-condensed text-xs text-muted-foreground">
              Você pode configurar as datas de corte a qualquer momento nas configurações.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={async () => { setConfirmSemConfigOpen(false); await handleIniciar(true) }}
                disabled={iniciando}
                className="font-barlow-condensed tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}
              >
                {iniciando ? 'Iniciando...' : 'Confirmar e iniciar'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmSemConfigOpen(false)} className="font-barlow-condensed">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}
