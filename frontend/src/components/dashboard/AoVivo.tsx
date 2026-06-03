'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trophy, Play, Pause, RotateCcw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

const COR_HEX: Record<CorTime, string> = {
  vermelho: '#ef4444', azul: '#3b82f6', verde: '#22c55e', laranja: '#f97316',
}
const COR_BG: Record<CorTime, string> = {
  vermelho: 'rgba(239,68,68,0.12)', azul: 'rgba(59,130,246,0.12)',
  verde: 'rgba(34,197,94,0.12)', laranja: 'rgba(249,115,22,0.12)',
}

const DURACAO_MS = 7 * 60 * 1000

type Jogador = { id: number; nome: string; apelido: string | null; convidado: boolean }
type TimeData = { id: number; nome: string; cor: string; jogadores: Jogador[] }
type GolData = {
  id: number; timeId: number; jogadorId: number; jogadorNome: string
  assistenciaJogadorId: number | null; assistenciaJogadorNome: string | null
}
type PartidaData = {
  id: number; timeAId: number; timeBId: number
  timeANome: string; timeBNome: string; timeACor: string; timeBCor: string
  status: string; inicioEm: string | null; timerAcumuladoMs: number; vencedorId: number | null
  gols: GolData[]
}

interface Props {
  diaId: number; data: string; cicloNome: string | null
  times: TimeData[]; partidas: PartidaData[]
}

// ─── Fase do jogo ────────────────────────────────────────────────────────────

type GamePhase =
  | { type: 'pronto' }
  | { type: 'configurando' }
  | { type: 'jogando'; partidaId: number; timeAId: number; timeBId: number; waitingTeamId: number }
  | { type: 'entre_partidas'; vencedorId: number; perdedorId: number; prevWaitingId: number; golsA: number; golsB: number }
  | { type: 'empate_decisao'; timeAId: number; timeBId: number; prevWaitingId: number }

function derivePhase(partidas: PartidaData[], times: TimeData[]): GamePhase {
  if (partidas.length === 0) return { type: 'pronto' }
  const last = partidas[partidas.length - 1]
  const waitingTeamId = times.find((t) => t.id !== last.timeAId && t.id !== last.timeBId)?.id ?? times[0].id

  if (last.status === 'EM_ANDAMENTO') {
    return { type: 'jogando', partidaId: last.id, timeAId: last.timeAId, timeBId: last.timeBId, waitingTeamId }
  }
  if (last.status === 'FINALIZADA') {
    if (last.vencedorId === null) {
      return { type: 'empate_decisao', timeAId: last.timeAId, timeBId: last.timeBId, prevWaitingId: waitingTeamId }
    }
    const perdedorId = last.vencedorId === last.timeAId ? last.timeBId : last.timeAId
    return {
      type: 'entre_partidas',
      vencedorId: last.vencedorId, perdedorId, prevWaitingId: waitingTeamId,
      golsA: last.gols.filter((g) => g.timeId === last.timeAId).length,
      golsB: last.gols.filter((g) => g.timeId === last.timeBId).length,
    }
  }
  return { type: 'pronto' }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(partidas: PartidaData[], times: TimeData[], localGols: GolData[]) {
  const victories: Record<number, number> = {}
  times.forEach((t) => { victories[t.id] = 0 })
  partidas.filter((p) => p.status === 'FINALIZADA' && p.vencedorId).forEach((p) => {
    victories[p.vencedorId!] = (victories[p.vencedorId!] ?? 0) + 1
  })
  const allGols = [...partidas.flatMap((p) => p.gols), ...localGols]
  const byPlayer: Record<number, { nome: string; gols: number; assists: number }> = {}
  allGols.forEach((g) => {
    if (!byPlayer[g.jogadorId]) byPlayer[g.jogadorId] = { nome: g.jogadorNome, gols: 0, assists: 0 }
    byPlayer[g.jogadorId].gols++
    if (g.assistenciaJogadorId) {
      const aid = g.assistenciaJogadorId
      if (!byPlayer[aid]) byPlayer[aid] = { nome: g.assistenciaJogadorNome!, gols: 0, assists: 0 }
      byPlayer[aid].assists++
    }
  })
  return { victories, jogadores: Object.values(byPlayer).sort((a, b) => b.gols - a.gols || b.assists - a.assists) }
}

// ─── TimeCard ─────────────────────────────────────────────────────────────────

function TimeCard({ time }: { time: TimeData }) {
  const hex = COR_HEX[time.cor as CorTime] ?? '#888'
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${hex}40`, background: '#111' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${hex}18`, borderBottom: `1px solid ${hex}30` }}>
        <span className="font-bebas tracking-widest text-xl" style={{ color: hex }}>{time.nome}</span>
        <div className="flex items-center gap-1.5 font-barlow-condensed text-xs capitalize" style={{ color: hex }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: hex }} />
          {time.cor}
        </div>
      </div>
      <div className="p-3 space-y-1">
        {time.jogadores.map((j) => (
          <div key={j.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-barlow-condensed text-sm"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: hex }} />
            <span className="flex-1 text-foreground">{j.nome}</span>
            {j.convidado && (
              <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>G</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── GolModal ─────────────────────────────────────────────────────────────────

function GolModal({ open, onClose, teamName, teamCor, teamPlayers, otherPlayers, onConfirm, saving }: {
  open: boolean; onClose: () => void; teamName: string; teamCor: string
  teamPlayers: Jogador[]; otherPlayers: Jogador[]
  onConfirm: (jogadorId: number, assistId: number | null) => void; saving: boolean
}) {
  const hex = COR_HEX[teamCor as CorTime] ?? '#888'
  const [jogadorId, setJogadorId] = useState('')
  const [assistId, setAssistId] = useState('')
  useEffect(() => { if (!open) { setJogadorId(''); setAssistId('') } }, [open])
  const assistPool = teamPlayers.filter((j) => String(j.id) !== jogadorId)
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">
            <span style={{ color: hex }}>GOL!</span>
            <span className="text-muted-foreground text-base font-barlow-condensed tracking-wide normal-case ml-2">{teamName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="font-barlow-condensed text-sm text-foreground">Quem marcou?</label>
            <select value={jogadorId} onChange={(e) => { setJogadorId(e.target.value); setAssistId('') }}
              className="w-full px-3 py-2.5 rounded-xl font-barlow-condensed text-sm focus:outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: jogadorId ? '#f0ede0' : '#666' }}>
              <option value="">Selecione o jogador</option>
              {teamPlayers.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-barlow-condensed text-sm text-foreground">
              Assistência <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <select value={assistId} onChange={(e) => setAssistId(e.target.value)} disabled={!jogadorId}
              className="w-full px-3 py-2.5 rounded-xl font-barlow-condensed text-sm focus:outline-none disabled:opacity-40"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: assistId ? '#f0ede0' : '#666' }}>
              <option value="">Sem assistência</option>
              {assistPool.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => onConfirm(Number(jogadorId), assistId ? Number(assistId) : null)}
              disabled={!jogadorId || saving} className="flex-1 font-barlow-condensed tracking-wide"
              style={{ background: hex, color: '#fff', border: 'none' }}>
              {saving ? 'Salvando...' : 'Confirmar Gol'}
            </Button>
            <Button variant="outline" onClick={onClose} className="font-barlow-condensed">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Stats do dia ─────────────────────────────────────────────────────────────

function StatsDia({ partidas, times, victories, jogadores }: {
  partidas: PartidaData[]; times: TimeData[]
  victories: Record<number, number>; jogadores: { nome: string; gols: number; assists: number }[]
}) {
  const finished = partidas.filter((p) => p.status === 'FINALIZADA')
  return (
    <div className="space-y-4 pt-2">
      <p className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">Placar do dia</p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((t) => {
          const hex = COR_HEX[t.cor as CorTime] ?? '#888'
          return (
            <div key={t.id} className="rounded-xl py-3 text-center" style={{ background: '#141414', border: '1px solid #222' }}>
              <div className="font-barlow-condensed text-xs text-muted-foreground capitalize truncate px-2">{t.nome}</div>
              <div className="font-bebas text-4xl" style={{ color: hex }}>{victories[t.id] ?? 0}</div>
              <div className="font-barlow-condensed text-[10px] text-muted-foreground">vitórias</div>
            </div>
          )
        })}
      </div>
      {jogadores.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#141414', border: '1px solid #222' }}>
            <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Artilheiros</div>
            {jogadores.filter((j) => j.gols > 0).slice(0, 5).map((j, i) => (
              <div key={i} className="flex items-center gap-1.5 font-barlow-condensed text-xs">
                <span className="text-muted-foreground w-3">{i + 1}</span>
                <span className="flex-1 text-foreground truncate">{j.nome}</span>
                <span style={{ color: '#f5c400', fontWeight: 600 }}>{j.gols}⚽</span>
              </div>
            ))}
            {jogadores.filter((j) => j.gols > 0).length === 0 && (
              <p className="font-barlow-condensed text-xs text-muted-foreground">Nenhum gol ainda</p>
            )}
          </div>
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#141414', border: '1px solid #222' }}>
            <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Assistências</div>
            {jogadores.filter((j) => j.assists > 0).slice(0, 5).map((j, i) => (
              <div key={i} className="flex items-center gap-1.5 font-barlow-condensed text-xs">
                <span className="text-muted-foreground w-3">{i + 1}</span>
                <span className="flex-1 text-foreground truncate">{j.nome}</span>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{j.assists}🎯</span>
              </div>
            ))}
            {jogadores.filter((j) => j.assists > 0).length === 0 && (
              <p className="font-barlow-condensed text-xs text-muted-foreground">Nenhuma</p>
            )}
          </div>
        </div>
      )}
      {finished.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">Histórico</div>
          {finished.map((p, i) => {
            const golsA = p.gols.filter((g) => g.timeId === p.timeAId).length
            const golsB = p.gols.filter((g) => g.timeId === p.timeBId).length
            const hexA = COR_HEX[p.timeACor as CorTime] ?? '#888'
            const hexB = COR_HEX[p.timeBCor as CorTime] ?? '#888'
            const vHex = p.vencedorId ? (p.vencedorId === p.timeAId ? hexA : hexB) : '#555'
            return (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg font-barlow-condensed text-xs"
                style={{ background: '#141414' }}>
                <span className="text-muted-foreground w-5">P{i + 1}</span>
                <span style={{ color: hexA }}>{p.timeANome}</span>
                <span className="font-bebas text-sm tracking-widest">{golsA}×{golsB}</span>
                <span style={{ color: hexB }}>{p.timeBNome}</span>
                <span className="ml-auto" style={{ color: vHex }}>{p.vencedorId ? '✓' : 'empate'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AoVivo({ diaId, data, cicloNome, times, partidas }: Props) {
  const router = useRouter()

  const [phase, setPhase] = useState<GamePhase>(() => derivePhase(partidas, times))
  const [localGols, setLocalGols] = useState<GolData[]>(() => {
    const last = partidas[partidas.length - 1]
    return last?.status === 'EM_ANDAMENTO' ? last.gols : []
  })
  const [golDialog, setGolDialog] = useState<{ equipe: 'A' | 'B' } | null>(null)
  const [savingGol, setSavingGol] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmAnular, setConfirmAnular] = useState(false)

  // ── Timer (client-side, nunca auto-start) ──
  type TimerState = 'parado' | 'rodando' | 'pausado'
  const [timerState, setTimerState] = useState<TimerState>('parado')
  const [inicioRodadaEm, setInicioRodadaEm] = useState<Date | null>(null)
  const [acumuladoMs, setAcumuladoMs] = useState(0)
  const [restanteMs, setRestanteMs] = useState(DURACAO_MS)

  useEffect(() => {
    if (timerState !== 'rodando' || !inicioRodadaEm) return
    const update = () => {
      const dec = Date.now() - inicioRodadaEm.getTime()
      setRestanteMs(Math.max(0, DURACAO_MS - acumuladoMs - dec))
    }
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [timerState, inicioRodadaEm, acumuladoMs])

  const timerMin = Math.floor(restanteMs / 60000)
  const timerSeg = Math.floor((restanteMs % 60000) / 1000)
  const timerDisplay = `${String(timerMin).padStart(2, '0')}:${String(timerSeg).padStart(2, '0')}`
  const timerEsgotado = restanteMs === 0

  function patchTimer(inicioEm: string | null, timerAcumuladoMs: number) {
    if (phase.type !== 'jogando') return
    fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'timer', inicioEm, timerAcumuladoMs }),
    }).catch(() => toast.error('Erro ao salvar cronômetro'))
  }

  function timerIniciar() {
    const agora = new Date()
    setInicioRodadaEm(agora)
    setTimerState('rodando')
    patchTimer(agora.toISOString(), acumuladoMs)
  }
  function timerPausar() {
    const novoAcumulado = inicioRodadaEm ? acumuladoMs + (Date.now() - inicioRodadaEm.getTime()) : acumuladoMs
    setAcumuladoMs(novoAcumulado)
    setInicioRodadaEm(null)
    setTimerState('pausado')
    patchTimer(null, novoAcumulado)
  }
  function timerReiniciar() {
    setInicioRodadaEm(null); setAcumuladoMs(0); setRestanteMs(DURACAO_MS); setTimerState('parado')
    patchTimer(null, 0)
  }

  // ── Re-sincroniza fase quando dados do servidor mudam ──
  const lastId = partidas[partidas.length - 1]?.id ?? 0
  const lastStatus = partidas[partidas.length - 1]?.status ?? ''
  useEffect(() => {
    const newPhase = derivePhase(partidas, times)
    setPhase(newPhase)
    if (newPhase.type === 'jogando') {
      const last = partidas[partidas.length - 1]
      if (last) {
        setLocalGols(last.gols)
        const acumulado = last.timerAcumuladoMs ?? 0
        const inicioFromServer = last.inicioEm ? new Date(last.inicioEm) : null
        if (inicioFromServer) {
          setInicioRodadaEm(inicioFromServer)
          setAcumuladoMs(acumulado)
          setTimerState('rodando')
        } else if (acumulado > 0) {
          setInicioRodadaEm(null)
          setAcumuladoMs(acumulado)
          setRestanteMs(Math.max(0, DURACAO_MS - acumulado))
          setTimerState('pausado')
        } else {
          setInicioRodadaEm(null); setAcumuladoMs(0); setRestanteMs(DURACAO_MS); setTimerState('parado')
        }
      }
    } else {
      setLocalGols([])
      setInicioRodadaEm(null); setAcumuladoMs(0); setRestanteMs(DURACAO_MS); setTimerState('parado')
    }
  }, [lastId, lastStatus, partidas.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = computeStats(partidas, times, phase.type === 'jogando' ? localGols : [])

  const golsA = phase.type === 'jogando' ? localGols.filter((g) => g.timeId === phase.timeAId).length : 0
  const golsB = phase.type === 'jogando' ? localGols.filter((g) => g.timeId === phase.timeBId).length : 0

  // ── Handlers ──

  async function handleConfirmarPartida(timeAId: number, timeBId: number) {
    setBusy(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeAId, timeBId, iniciar: true }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao criar partida'); return }
      toast.success('Partida criada — clique Iniciar para começar o cronômetro')
      timerReiniciar()
      router.refresh()
    } finally { setBusy(false) }
  }

  async function handleGolConfirm(jogadorId: number, assistId: number | null) {
    if (phase.type !== 'jogando' || !golDialog) return
    const timeId = golDialog.equipe === 'A' ? phase.timeAId : phase.timeBId
    setSavingGol(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}/gols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogadorId, timeId, assistenciaJogadorId: assistId }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao marcar gol'); return }
      const body = await res.json()
      setLocalGols((prev) => [...prev, {
        id: body.id, timeId, jogadorId, jogadorNome: body.jogadorNome,
        assistenciaJogadorId: assistId, assistenciaJogadorNome: body.assistenciaNome ?? null,
      }])
      setGolDialog(null)
      toast.success(`Gol de ${body.jogadorNome}!${body.assistenciaNome ? ` Assist.: ${body.assistenciaNome}` : ''}`)
    } finally { setSavingGol(false) }
  }

  async function handleEncerrarPartida() {
    if (phase.type !== 'jogando') return
    const vencedorId = golsA > golsB ? phase.timeAId : golsB > golsA ? phase.timeBId : null
    if (timerState === 'rodando') timerPausar()
    setBusy(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZADA', vencedorId }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao encerrar partida'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  async function handleEncerrarDia() {
    setBusy(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZADO' }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro'); return }
      toast.success('Dia de jogo encerrado')
      router.push('/dias-de-jogo')
    } finally { setBusy(false) }
  }

  async function handleAnular() {
    setBusy(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/anular`, { method: 'POST' })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro'); return }
      toast.success('Dia anulado — esquema disponível para edição')
      router.refresh()
      router.push(`/dias-de-jogo/${diaId}`)
    } finally { setBusy(false); setConfirmAnular(false) }
  }

  const getTime = (id: number) => times.find((t) => t.id === id)!

  // ── Render ──

  return (
    <div className="space-y-5">

      {/* ── PRONTO ── */}
      {phase.type === 'pronto' && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: '#0f1a0f', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
            <span className="font-barlow-condensed text-sm tracking-wide" style={{ color: '#22c55e' }}>
              Tudo pronto para começar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {times.map((t) => <TimeCard key={t.id} time={t} />)}
          </div>

          <div className="space-y-3">
            <button onClick={() => setPhase({ type: 'configurando' })} disabled={busy}
              className="w-full py-4 rounded-xl font-bebas text-2xl tracking-widest disabled:opacity-40"
              style={{ background: '#f5c400', color: '#000' }}>
              INICIAR JOGO
            </button>
            <div className="flex gap-2">
              <button onClick={handleEncerrarDia} disabled={busy}
                className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm tracking-wide"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={14} className="inline mr-1.5" />Encerrar Dia
              </button>
              <button onClick={() => setConfirmAnular(true)} disabled={busy}
                className="px-5 py-2.5 rounded-xl font-barlow-condensed text-sm tracking-wide border"
                style={{ borderColor: '#333', color: '#666', background: 'transparent' }}>
                <XCircle size={14} className="inline mr-1.5" />Anular
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CONFIGURANDO ── */}
      {phase.type === 'configurando' && (
        <SelecaoPartida
          times={times}
          isFirst={partidas.length === 0}
          onConfirmar={handleConfirmarPartida}
          onCancelar={() => setPhase(derivePhase(partidas, times))}
          busy={busy}
        />
      )}

      {/* ── JOGANDO ── */}
      {phase.type === 'jogando' && (() => {
        const timeA = getTime(phase.timeAId)
        const timeB = getTime(phase.timeBId)
        const timeEspera = getTime(phase.waitingTeamId)
        const hexA = COR_HEX[timeA.cor as CorTime] ?? '#888'
        const hexB = COR_HEX[timeB.cor as CorTime] ?? '#888'
        const bgA = COR_BG[timeA.cor as CorTime] ?? 'rgba(128,128,128,0.12)'
        const bgB = COR_BG[timeB.cor as CorTime] ?? 'rgba(128,128,128,0.12)'

        return (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#242424', background: '#111' }}>
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: '#1e1e1e', background: '#0a0a0a' }}>
              <div className="flex items-center gap-2">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: '#ef4444' }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                </span>
                <span className="font-bebas tracking-widest" style={{ color: '#f5c400' }}>PARTIDA {partidas.length}</span>
              </div>
              {timeEspera && (
                <span className="font-barlow-condensed text-xs text-muted-foreground flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COR_HEX[timeEspera.cor as CorTime] ?? '#888' }} />
                  {timeEspera.nome} aguarda
                </span>
              )}
            </div>

            {/* Placar + cronômetro */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
                {/* Time A */}
                <div className="flex-1 rounded-xl py-3 text-center" style={{ background: bgA, border: `1px solid ${hexA}30` }}>
                  <div className="font-bebas tracking-widest text-lg leading-none" style={{ color: hexA }}>{timeA.nome}</div>
                  <div className="font-bebas text-6xl tabular-nums mt-1 leading-none" style={{ color: hexA }}>{golsA}</div>
                </div>

                {/* Timer central */}
                <div className="text-center flex-shrink-0 px-1 space-y-1.5" style={{ minWidth: 80 }}>
                  <div className="font-bebas text-3xl tracking-widest tabular-nums"
                    style={{ color: timerEsgotado ? '#ef4444' : timerState === 'parado' ? '#444' : '#f0ede0' }}>
                    {timerDisplay}
                  </div>

                  {/* Controles do timer */}
                  <div className="flex items-center justify-center gap-1">
                    {timerState === 'parado' && (
                      <button onClick={timerIniciar}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-md font-barlow-condensed text-[10px] font-bold tracking-wide"
                        style={{ background: '#f5c400', color: '#000' }}>
                        <Play size={8} fill="#000" /> iniciar
                      </button>
                    )}
                    {timerState === 'rodando' && (
                      <>
                        <button onClick={timerPausar}
                          className="p-1.5 rounded-md" style={{ background: '#222', color: '#f0ede0' }}>
                          <Pause size={11} />
                        </button>
                        <button onClick={timerReiniciar}
                          className="p-1.5 rounded-md" style={{ background: '#181818', color: '#555' }}>
                          <RotateCcw size={10} />
                        </button>
                      </>
                    )}
                    {timerState === 'pausado' && (
                      <>
                        <button onClick={timerIniciar}
                          className="flex items-center gap-0.5 px-1.5 py-1 rounded-md font-barlow-condensed text-[10px] font-bold"
                          style={{ background: '#f5c400', color: '#000' }}>
                          <Play size={8} fill="#000" /> retomar
                        </button>
                        <button onClick={timerReiniciar}
                          className="p-1.5 rounded-md" style={{ background: '#181818', color: '#555' }}>
                          <RotateCcw size={10} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="font-bebas text-lg text-muted-foreground">VS</div>
                </div>

                {/* Time B */}
                <div className="flex-1 rounded-xl py-3 text-center" style={{ background: bgB, border: `1px solid ${hexB}30` }}>
                  <div className="font-bebas tracking-widest text-lg leading-none" style={{ color: hexB }}>{timeB.nome}</div>
                  <div className="font-bebas text-6xl tabular-nums mt-1 leading-none" style={{ color: hexB }}>{golsB}</div>
                </div>
              </div>
            </div>

            {/* Botões de gol */}
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <button onClick={() => setGolDialog({ equipe: 'A' })} disabled={busy || savingGol}
                className="py-4 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
                style={{ background: bgA, color: hexA, border: `1px solid ${hexA}40` }}>
                + Gol {timeA.nome}
              </button>
              <button onClick={() => setGolDialog({ equipe: 'B' })} disabled={busy || savingGol}
                className="py-4 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
                style={{ background: bgB, color: hexB, border: `1px solid ${hexB}40` }}>
                + Gol {timeB.nome}
              </button>
            </div>

            {/* Gols recentes */}
            {localGols.length > 0 && (
              <div className="px-4 pb-3">
                <div className="rounded-xl px-3 py-2.5 space-y-1.5" style={{ background: '#0a0a0a' }}>
                  <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">Gols</div>
                  {[...localGols].reverse().map((g, i) => {
                    const hex = g.timeId === phase.timeAId ? hexA : hexB
                    return (
                      <div key={i} className="flex items-center gap-2 font-barlow-condensed text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: hex }} />
                        <span style={{ color: hex }}>{g.jogadorNome}</span>
                        {g.assistenciaJogadorNome && <span className="text-muted-foreground">→ {g.assistenciaJogadorNome}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Encerrar partida */}
            <div className="px-4 pb-4">
              <button onClick={handleEncerrarPartida} disabled={busy}
                className="w-full py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
                style={{ background: 'rgba(245,196,0,0.12)', color: '#f5c400', border: '1px solid rgba(245,196,0,0.25)' }}>
                Encerrar Partida
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── ENTRE PARTIDAS ── */}
      {phase.type === 'entre_partidas' && (() => {
        const vencedor = getTime(phase.vencedorId)
        const perdedor = getTime(phase.perdedorId)
        const proximo = getTime(phase.prevWaitingId)
        const hexV = COR_HEX[vencedor.cor as CorTime] ?? '#888'
        const hexP = COR_HEX[perdedor.cor as CorTime] ?? '#888'
        const hexPr = COR_HEX[proximo.cor as CorTime] ?? '#888'
        return (
          <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: '#242424', background: '#111' }}>
            <div>
              <div className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">Resultado · Partida {partidas.length}</div>
              <div className="font-bebas text-2xl tracking-wide mt-1">
                <span style={{ color: hexV }}>{phase.golsA > phase.golsB ? phase.golsA : phase.golsB}</span>
                <span className="text-muted-foreground mx-2">×</span>
                <span style={{ color: hexP }}>{phase.golsA > phase.golsB ? phase.golsB : phase.golsA}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Trophy size={14} style={{ color: hexV }} />
                <span className="font-barlow-condensed text-sm font-semibold" style={{ color: hexV }}>{vencedor.nome} vence!</span>
              </div>
            </div>
            <div className="h-px" style={{ background: '#242424' }} />
            <div>
              <div className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground mb-2">Próxima Partida</div>
              <div className="flex items-center gap-2 font-barlow-condensed text-sm flex-wrap">
                <span style={{ color: hexV, fontWeight: 600 }}>{vencedor.nome}</span>
                <span className="text-muted-foreground text-xs">fica</span>
                <span className="font-bebas text-lg text-muted-foreground">VS</span>
                <span style={{ color: hexPr, fontWeight: 600 }}>{proximo.nome}</span>
                <span className="text-muted-foreground text-xs">entra</span>
              </div>
              <div className="font-barlow-condensed text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: hexP }} />{perdedor.nome} aguarda
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleConfirmarPartida(phase.vencedorId, phase.prevWaitingId)} disabled={busy}
                className="flex-1 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
                style={{ background: '#f5c400', color: '#000' }}>
                {busy ? 'Criando...' : 'Iniciar Próxima Partida'}
              </button>
              <button onClick={handleEncerrarDia} disabled={busy}
                className="px-4 py-3 rounded-xl font-barlow-condensed text-sm tracking-wide"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                Encerrar Dia
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── EMPATE DECISÃO ── */}
      {phase.type === 'empate_decisao' && (() => {
        const timeA = getTime(phase.timeAId)
        const timeB = getTime(phase.timeBId)
        const timeEspera = getTime(phase.prevWaitingId)
        return (
          <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'rgba(245,196,0,0.3)', background: '#111' }}>
            <div>
              <div className="font-bebas tracking-widest text-2xl" style={{ color: '#f5c400' }}>EMPATE!</div>
              <p className="font-barlow-condensed text-sm text-muted-foreground mt-1">
                Quem fica na quadra para enfrentar o{' '}
                <span style={{ color: COR_HEX[timeEspera.cor as CorTime] ?? '#888' }}>{timeEspera.nome}</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[timeA, timeB].map((t) => {
                const hex = COR_HEX[t.cor as CorTime] ?? '#888'
                return (
                  <button key={t.id} onClick={() => handleConfirmarPartida(t.id, phase.prevWaitingId)} disabled={busy}
                    className="py-4 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
                    style={{ background: `${hex}18`, color: hex, border: `1px solid ${hex}40` }}>
                    {t.nome} fica
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Stats ── */}
      {partidas.length > 0 && (
        <StatsDia partidas={partidas} times={times} victories={stats.victories} jogadores={stats.jogadores} />
      )}

      {/* ── Ações globais na fase jogando ── */}
      {phase.type === 'jogando' && (
        <div className="flex gap-2">
          <button onClick={handleEncerrarDia} disabled={busy}
            className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-xs tracking-wide"
            style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            Encerrar confronto
          </button>
          <button onClick={() => setConfirmAnular(true)} disabled={busy}
            className="px-4 py-2.5 rounded-xl font-barlow-condensed text-xs tracking-wide border"
            style={{ borderColor: '#2a2a2a', color: '#555', background: 'transparent' }}>
            Anular confronto
          </button>
        </div>
      )}

      {/* ── GolModal ── */}
      {phase.type === 'jogando' && golDialog && (() => {
        const isA = golDialog.equipe === 'A'
        const team = isA ? getTime(phase.timeAId) : getTime(phase.timeBId)
        const other = isA ? getTime(phase.timeBId) : getTime(phase.timeAId)
        return (
          <GolModal open={!!golDialog} onClose={() => setGolDialog(null)}
            teamName={team.nome} teamCor={team.cor}
            teamPlayers={team.jogadores} otherPlayers={other.jogadores}
            onConfirm={handleGolConfirm} saving={savingGol} />
        )
      })()}

      {/* ── Confirmar Anular ── */}
      <Dialog open={confirmAnular} onOpenChange={setConfirmAnular}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl flex items-center gap-2">
              <AlertTriangle size={20} style={{ color: '#fb923c' }} />
              Anular confronto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm leading-relaxed" style={{ color: '#f0ede0' }}>
              Todas as partidas e gols serão excluídos. O esquema volta para edição.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleAnular} disabled={busy} className="font-barlow-condensed tracking-wide">
                {busy ? 'Anulando...' : 'Sim, anular'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmAnular(false)} className="font-barlow-condensed">Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Seleção de partida ───────────────────────────────────────────────────────

function TimeSelector({ label, selectedId, disabledId, times, onChange }: {
  label: string
  selectedId: string
  disabledId: string
  times: TimeData[]
  onChange: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {times.map((t) => {
          const hex = COR_HEX[t.cor as CorTime] ?? '#888'
          const selected = String(t.id) === selectedId
          const disabled = String(t.id) === disabledId
          return (
            <button
              key={t.id}
              onClick={() => onChange(String(t.id))}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                border: `1.5px solid ${selected ? hex : '#2a2a2a'}`,
                background: selected ? `${hex}20` : '#151515',
                color: selected ? hex : hex,
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hex, opacity: selected ? 1 : 0.5 }} />
              {t.nome}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SelecaoPartida({ times, isFirst, onConfirmar, onCancelar, busy }: {
  times: TimeData[]; isFirst: boolean
  onConfirmar: (a: number, b: number) => void; onCancelar: () => void; busy: boolean
}) {
  const [timeAId, setTimeAId] = useState('')
  const [timeBId, setTimeBId] = useState('')
  const invalido = !timeAId || !timeBId || timeAId === timeBId
  const waiting = timeAId && timeBId ? times.find((t) => String(t.id) !== timeAId && String(t.id) !== timeBId) : null

  return (
    <div className="rounded-xl border p-5 space-y-5" style={{ borderColor: '#242424', background: '#111' }}>
      <div>
        <div className="font-bebas tracking-widest text-xl" style={{ color: '#f5c400' }}>
          {isFirst ? 'PRIMEIRO CONFRONTO' : 'PRÓXIMO CONFRONTO'}
        </div>
        <p className="font-barlow-condensed text-sm text-muted-foreground">Selecione os times que vão jogar</p>
      </div>

      <TimeSelector label="Time A" selectedId={timeAId} disabledId={timeBId} times={times} onChange={setTimeAId} />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
        <span className="font-bebas text-lg flex-shrink-0" style={{ color: '#ef4444' }}>VS</span>
        <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
      </div>

      <TimeSelector label="Time B" selectedId={timeBId} disabledId={timeAId} times={times} onChange={setTimeBId} />

      {waiting && (
        <div className="flex items-center gap-2 font-barlow-condensed text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full" style={{ background: COR_HEX[waiting.cor as CorTime] ?? '#888' }} />
          <span><strong style={{ color: COR_HEX[waiting.cor as CorTime] ?? '#888' }}>{waiting.nome}</strong> aguarda</span>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => onConfirmar(Number(timeAId), Number(timeBId))} disabled={invalido || busy}
          className="flex-1 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-30"
          style={{ background: '#f5c400', color: '#000' }}>
          {busy ? 'Criando...' : 'Confirmar'}
        </button>
        <button onClick={onCancelar} disabled={busy}
          className="px-4 py-3 rounded-xl font-barlow-condensed text-sm tracking-wide border"
          style={{ borderColor: '#333', color: '#888', background: 'transparent' }}>
          Voltar
        </button>
      </div>
    </div>
  )
}
