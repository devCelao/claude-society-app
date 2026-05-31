'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Play, Pause, RotateCcw, ArrowRight, CirclePlus, BarChart2, Pencil, Trash2, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { DashboardData, CorTime } from '@/app/api/dashboard/route'

const COR_HEX: Record<CorTime, string> = {
  vermelho: '#ef4444',
  azul:     '#3b82f6',
  verde:    '#22c55e',
  laranja:  '#f97316',
}

const COR_BG: Record<CorTime, string> = {
  vermelho: 'rgba(239,68,68,0.18)',
  azul:     'rgba(59,130,246,0.18)',
  verde:    'rgba(34,197,94,0.18)',
  laranja:  'rgba(249,115,22,0.18)',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const DURACAO_MS = 7 * 60 * 1000

type MatchStatus = 'aguardando_inicio' | 'em_andamento' | 'pausado'
type GolEntry = {
  id: string
  equipe: 'A' | 'B'
  timeNome: string
  cor: CorTime
  jogadorId: number
  jogadorNome: string
  assistId?: number
  assistNome?: string
  minuto: string
  contra: boolean
}
type Vitorias = Record<number, number>

// ─── Dialog de Registro de Gol ───────────────────────────────────────────────

type TimeInfo = DashboardData['diaAtivo']['times'][number]

function GolDialog({
  open, onOpenChange, equipe, timeA, timeB, minuto,
  golExistente, onSalvar, onExcluir,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  equipe: 'A' | 'B'
  timeA: TimeInfo
  timeB: TimeInfo
  minuto: string
  golExistente: GolEntry | null
  onSalvar: (dados: Omit<GolEntry, 'id' | 'minuto'>) => void
  onExcluir?: () => void
}) {
  const [aFavor, setAFavor] = useState(true)
  const [jogadorId, setJogadorId] = useState('')
  const [assistId, setAssistId] = useState('')

  useEffect(() => {
    if (!open) return
    setAFavor(golExistente ? !golExistente.contra : true)
    setJogadorId(golExistente ? String(golExistente.jogadorId) : '')
    setAssistId(golExistente?.assistId ? String(golExistente.assistId) : '')
  }, [open, golExistente])

  const timeScorerOrigem = equipe === 'A' ? timeA : timeB
  const timeCredito = aFavor
    ? (equipe === 'A' ? timeA : timeB)
    : (equipe === 'A' ? timeB : timeA)
  const todosJogadores = [...timeA.jogadores, ...timeB.jogadores]
  const jogadoresScorerPool = timeScorerOrigem.jogadores
  const jogadoresAssistPool = todosJogadores.filter((j) => String(j.id) !== jogadorId)

  function handleSalvar() {
    if (!jogadorId) return
    const jogador = todosJogadores.find((j) => j.id === Number(jogadorId))!
    const assist = assistId ? todosJogadores.find((j) => j.id === Number(assistId)) : undefined
    onSalvar({
      equipe: aFavor ? equipe : (equipe === 'A' ? 'B' : 'A'),
      timeNome: timeCredito.nome,
      cor: timeCredito.cor,
      jogadorId: jogador.id,
      jogadorNome: jogador.nome,
      assistId: assist?.id,
      assistNome: assist?.nome,
      contra: !aFavor,
    })
    onOpenChange(false)
  }

  const hexCredito = COR_HEX[timeCredito.cor]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">
            {golExistente ? 'Editar Gol' : 'Registrar Gol'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Toggle A favor / Contra */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setAFavor(true)}
              className="font-barlow-condensed text-sm font-semibold tracking-wide transition-colors"
              style={{ color: aFavor ? COR_HEX[timeScorerOrigem.cor] : '#555' }}
            >
              A favor
            </button>
            <button
              onClick={() => setAFavor((v) => !v)}
              className="w-12 h-6 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: aFavor ? COR_HEX[timeScorerOrigem.cor] : '#555' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: aFavor ? '2px' : 'calc(100% - 22px)' }}
              />
            </button>
            <button
              onClick={() => setAFavor(false)}
              className="font-barlow-condensed text-sm font-semibold tracking-wide transition-colors"
              style={{ color: !aFavor ? '#f87171' : '#555' }}
            >
              Contra
            </button>
          </div>

          {/* Indicador do time que recebe o gol */}
          <div className="text-center font-barlow-condensed text-xs text-muted-foreground">
            Gol creditado ao{' '}
            <span className="font-semibold" style={{ color: hexCredito }}>
              {timeCredito.nome}
            </span>
            {!aFavor && <span className="text-muted-foreground"> (contra)</span>}
          </div>

          {/* Quem marcou */}
          <div className="space-y-1.5">
            <label className="font-barlow-condensed text-sm text-foreground">
              Quem marcou o gol?
            </label>
            <select
              value={jogadorId}
              onChange={(e) => { setJogadorId(e.target.value); setAssistId('') }}
              className="w-full px-3 py-2.5 rounded-xl font-barlow-condensed text-sm text-foreground focus:outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333' }}
            >
              <option value="">Selecione o jogador</option>
              {jogadoresScorerPool.map((j) => (
                <option key={j.id} value={j.id}>{j.nome}</option>
              ))}
            </select>
          </div>

          {/* Assistência (só se não for contra) */}
          {aFavor && (
            <div className="space-y-1.5">
              <label className="font-barlow-condensed text-sm text-foreground">
                Quem deu a assistência?{' '}
                <span className="text-muted-foreground text-xs">(opcional)</span>
              </label>
              <select
                value={assistId}
                onChange={(e) => setAssistId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl font-barlow-condensed text-sm text-foreground focus:outline-none"
                style={{ background: '#1a1a1a', border: '1px solid #333' }}
              >
                <option value="">Nenhuma assistência</option>
                {jogadoresAssistPool.map((j) => (
                  <option key={j.id} value={j.id}>{j.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSalvar}
              disabled={!jogadorId}
              className="flex-1 font-barlow-condensed tracking-wide"
              style={{ background: '#3b82f6', color: '#fff', border: 'none' }}
            >
              {golExistente ? 'Salvar alterações' : 'Salvar Gol'}
            </Button>
            {golExistente && onExcluir && (
              <Button
                variant="outline"
                onClick={() => { onExcluir(); onOpenChange(false) }}
                className="font-barlow-condensed tracking-wide gap-1.5"
                style={{ borderColor: '#f87171', color: '#f87171' }}
              >
                <Trash2 size={14} /> Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PulsingDot() {
  return (
    <span className="relative flex items-center justify-center w-2.5 h-2.5 flex-shrink-0">
      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: '#ef4444' }} />
      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
    </span>
  )
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

// ─── Sub-view: Configurar Partida ───────────────────────────────────────────

function ConfigurarPartida({
  times,
  vitorias,
  historicoDia,
  diaId,
  dataStr,
  onConfirmar,
  onEncerrarDia,
  onAnularDia,
}: {
  times: DashboardData['diaAtivo']['times']
  vitorias: Vitorias
  historicoDia: GolEntry[]
  diaId: number
  dataStr: string
  onConfirmar: (idA: number, idB: number) => void
  onEncerrarDia: () => void
  onAnularDia: () => void
}) {
  const [timeAId, setTimeAId] = useState<string>('')
  const [timeBId, setTimeBId] = useState<string>('')

  const invalido = !timeAId || !timeBId || timeAId === timeBId

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e1e', background: '#0a0a0a' }}>
        <div className="flex items-center gap-2">
          <PulsingDot />
          <span className="font-bebas tracking-widest text-lg" style={{ color: '#f5c400' }}>
            CONFIGURAR PARTIDA
          </span>
          <span className="font-barlow-condensed text-sm text-muted-foreground ml-1">
            · {formatData(dataStr)}
          </span>
        </div>
        <Link href={`/dias-de-jogo/${diaId}`} className="flex items-center gap-1 font-barlow-condensed text-xs tracking-wide text-muted-foreground hover:text-foreground transition-colors">
          Ver dia <ArrowRight size={12} />
        </Link>
      </div>

      {/* Seleção de times */}
      <div className="px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
          {/* Time A */}
          <div className="flex-1 space-y-1.5">
            <label className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">
              Time A:
            </label>
            <select
              value={timeAId}
              onChange={(e) => setTimeAId(e.target.value)}
              className="w-full px-3 py-3 rounded-xl font-barlow-condensed text-sm text-foreground cursor-pointer focus:outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333' }}
            >
              <option value="">Selecione um time</option>
              {times.map((t) => (
                <option key={t.id} value={t.id} disabled={String(t.id) === timeBId}>
                  {t.nome} ({t.cor})
                </option>
              ))}
            </select>
          </div>

          {/* VS */}
          <div className="text-center sm:pb-2.5 font-bebas text-2xl tracking-widest flex-shrink-0 leading-none py-1 sm:py-0" style={{ color: '#ef4444' }}>
            VS
          </div>

          {/* Time B */}
          <div className="flex-1 space-y-1.5">
            <label className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">
              Time B:
            </label>
            <select
              value={timeBId}
              onChange={(e) => setTimeBId(e.target.value)}
              className="w-full px-3 py-3 rounded-xl font-barlow-condensed text-sm text-foreground cursor-pointer focus:outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333' }}
            >
              <option value="">Selecione um time</option>
              {times.map((t) => (
                <option key={t.id} value={t.id} disabled={String(t.id) === timeAId}>
                  {t.nome} ({t.cor})
                </option>
              ))}
            </select>
          </div>
        </div>

        {timeAId && timeBId && timeAId === timeBId && (
          <p className="font-barlow-condensed text-xs text-destructive">
            Os dois times não podem ser iguais
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirmar(Number(timeAId), Number(timeBId))}
            disabled={invalido}
            className="flex-1 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-30"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            Confirmar Confronto
          </button>
          <Link
            href="/ciclos"
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-barlow-condensed text-sm tracking-wide border transition-colors"
            style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
          >
            <BarChart2 size={14} />
            Estatísticas
          </Link>
        </div>
      </div>

      {/* Vitórias do dia */}
      {times.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {times.map((t) => {
            const hex = COR_HEX[t.cor]
            return (
              <div key={t.id} className="rounded-xl py-3 text-center" style={{ background: '#141414', border: '1px solid #222' }}>
                <div className="font-barlow-condensed text-xs text-muted-foreground mb-0.5 truncate px-1 capitalize">{t.nome}</div>
                <div className="font-bebas text-3xl" style={{ color: hex }}>{vitorias[t.id] ?? 0}</div>
                <div className="font-barlow-condensed text-[10px] text-muted-foreground tracking-wide">vitórias</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Histórico do dia */}
      {historicoDia.length > 0 && (
        <div className="px-4 pb-4">
          <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: '#141414', border: '1px solid #222' }}>
            <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
              Histórico de Gols do Dia
            </div>
            {historicoDia.map((g, i) => (
              <div key={i} className="flex items-center gap-2 font-barlow-condensed text-sm">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COR_HEX[g.cor] }} />
                <span style={{ color: COR_HEX[g.cor] }}>{g.jogadorNome}</span>
                <span className="text-muted-foreground ml-auto text-xs">{g.minuto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações do dia */}
      <div className="px-4 pb-5 flex gap-2">
        <button
          onClick={onEncerrarDia}
          className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          Encerrar Dia de Jogo
        </button>
        <button
          onClick={onAnularDia}
          className="py-2.5 px-4 rounded-xl font-barlow-condensed text-sm tracking-wide border"
          style={{ borderColor: '#333', color: '#555', background: 'transparent' }}
        >
          Anular Dia
        </button>
      </div>
    </div>
  )
}

// ─── Sub-view: Partida em Andamento ─────────────────────────────────────────

function PartidaEmAndamento({
  timeA,
  timeB,
  timeEspera,
  vitorias,
  historicoDia,
  onEncerrar,
  onAnular,
  onGol,
}: {
  timeA: TimeInfo
  timeB: TimeInfo
  timeEspera: TimeInfo | undefined
  vitorias: Vitorias
  historicoDia: GolEntry[]
  onEncerrar: (golsA: number, golsB: number) => void
  onAnular: () => void
  onGol: (gol: GolEntry) => void
}) {
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('aguardando_inicio')
  const [inicioRodadaEm, setInicioRodadaEm] = useState<Date | null>(null)
  const [acumuladoMs, setAcumuladoMs] = useState(0)
  const [gols, setGols] = useState<GolEntry[]>([])
  const [restanteMs, setRestanteMs] = useState(DURACAO_MS)
  const [confirmReiniciar, setConfirmReiniciar] = useState(false)
  const [golDialog, setGolDialog] = useState<{ equipe: 'A' | 'B'; golExistente: GolEntry | null } | null>(null)

  const hexA = COR_HEX[timeA.cor]
  const hexB = COR_HEX[timeB.cor]

  useEffect(() => {
    if (matchStatus !== 'em_andamento' || !inicioRodadaEm) return
    function tick() {
      const totalDecorrido = acumuladoMs + (Date.now() - inicioRodadaEm!.getTime())
      setRestanteMs(Math.max(0, DURACAO_MS - totalDecorrido))
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [matchStatus, inicioRodadaEm, acumuladoMs])

  const min = Math.floor(restanteMs / 60000)
  const seg = Math.floor((restanteMs % 60000) / 1000)
  const progresso = 1 - restanteMs / DURACAO_MS
  const tempoEsgotado = restanteMs === 0
  const deveEncerrar = tempoEsgotado
  const golsA = gols.filter((g) => g.equipe === 'A').length
  const golsB = gols.filter((g) => g.equipe === 'B').length

  function handleIniciar() {
    setInicioRodadaEm(new Date())
    setMatchStatus('em_andamento')
  }

  function handlePausar() {
    const decorrido = inicioRodadaEm ? Date.now() - inicioRodadaEm.getTime() : 0
    setAcumuladoMs((a) => a + decorrido)
    setInicioRodadaEm(null)
    setMatchStatus('pausado')
  }

  function handleRetomar() {
    setInicioRodadaEm(new Date())
    setMatchStatus('em_andamento')
  }

  function handleReiniciarConfirmado() {
    setMatchStatus('aguardando_inicio')
    setInicioRodadaEm(null)
    setAcumuladoMs(0)
    setRestanteMs(DURACAO_MS)
    setGols([])
    setConfirmReiniciar(false)
  }

  function getMinuto(): string {
    const totalDecorrido = inicioRodadaEm
      ? acumuladoMs + (Date.now() - inicioRodadaEm.getTime())
      : acumuladoMs
    const m = Math.floor(totalDecorrido / 60000)
    const s = Math.floor((totalDecorrido % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function handleSalvarGol(equipe: 'A' | 'B', dados: Omit<GolEntry, 'id' | 'minuto'>, golExistente: GolEntry | null) {
    const minuto = golExistente ? golExistente.minuto : getMinuto()
    if (golExistente) {
      const updated = { ...golExistente, ...dados, minuto }
      setGols((prev) => prev.map((g) => g.id === golExistente.id ? updated : g))
      onGol(updated)
    } else {
      const novo: GolEntry = { ...dados, id: `${Date.now()}`, minuto }
      setGols((prev) => [novo, ...prev])
      onGol(novo)
    }
  }

  function handleExcluirGol(id: string) {
    setGols((prev) => prev.filter((g) => g.id !== id))
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e1e', background: '#0a0a0a' }}>
        <div className="flex items-center gap-2">
          <PulsingDot />
          <span className="font-bebas tracking-widest text-lg" style={{ color: '#ef4444' }}>PARTIDA EM ANDAMENTO</span>
        </div>
        {timeEspera && (
          <span className="font-barlow-condensed text-xs text-muted-foreground flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: COR_HEX[timeEspera.cor] }} />
            {timeEspera.nome} aguarda
          </span>
        )}
      </div>

      {/* Placar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 py-2.5 rounded-xl text-center font-bebas text-lg tracking-widest"
            style={{ background: COR_BG[timeA.cor], color: hexA, border: `1px solid ${hexA}30` }}>
            {timeA.nome}
          </div>
          <div className="flex-shrink-0 text-center px-1">
            <div className="font-bebas text-4xl tracking-widest tabular-nums">
              {golsA} <span className="text-muted-foreground">:</span> {golsB}
            </div>
          </div>
          <div className="flex-1 py-2.5 rounded-xl text-center font-bebas text-lg tracking-widest"
            style={{ background: COR_BG[timeB.cor], color: hexB, border: `1px solid ${hexB}30` }}>
            {timeB.nome}
          </div>
        </div>
      </div>

      {/* Cronômetro */}
      <div className="mx-4 mb-3 rounded-xl px-4 py-2.5 text-center space-y-1.5" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="font-bebas text-4xl tracking-widest tabular-nums"
          style={{ color: tempoEsgotado ? '#f87171' : '#f0ede0' }}>
          {String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}
        </div>
        {matchStatus === 'em_andamento' && (
          <div className="w-full h-1.5 rounded-full overflow-hidden mx-auto max-w-xs" style={{ background: '#2a2a2a' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progresso * 100}%`, background: tempoEsgotado ? '#f87171' : '#f5c400' }} />
          </div>
        )}
        <div className="font-barlow-condensed text-sm text-muted-foreground">
          {matchStatus === 'aguardando_inicio' && 'Aguardando início'}
          {matchStatus === 'pausado' && <span style={{ color: '#f5c400' }}>⏸ Pausado</span>}
          {matchStatus === 'em_andamento' && !deveEncerrar && 'Em andamento'}
          {matchStatus === 'em_andamento' && deveEncerrar && (
            <span style={{ color: '#f87171' }}>Tempo esgotado!</span>
          )}
        </div>

        {confirmReiniciar ? (
          <div className="space-y-2">
            <p className="font-barlow-condensed text-sm text-foreground">
              Reiniciar vai zerar placar e cronômetro. Confirmar?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={handleReiniciarConfirmado}
                className="px-4 py-1.5 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide"
                style={{ background: '#ef4444', color: '#fff' }}>
                Sim, reiniciar
              </button>
              <button onClick={() => setConfirmReiniciar(false)}
                className="px-4 py-1.5 rounded-lg font-barlow-condensed text-sm tracking-wide border"
                style={{ borderColor: '#333', color: '#888' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {matchStatus === 'aguardando_inicio' && (
              <button onClick={handleIniciar}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}>
                <Play size={14} strokeWidth={2.5} /> Iniciar
              </button>
            )}
            {matchStatus === 'em_andamento' && !deveEncerrar && (
              <button onClick={handlePausar}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide border"
                style={{ borderColor: '#f5c400', color: '#f5c400', background: 'transparent' }}>
                <Pause size={14} strokeWidth={2.5} /> Pausar
              </button>
            )}
            {matchStatus === 'pausado' && (
              <button onClick={handleRetomar}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}>
                <Play size={14} strokeWidth={2.5} /> Retomar
              </button>
            )}
            {matchStatus !== 'aguardando_inicio' && (
              <button onClick={() => setConfirmReiniciar(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-barlow-condensed text-sm tracking-wide border"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}>
                <RotateCcw size={13} /> Reiniciar
              </button>
            )}
            {matchStatus === 'aguardando_inicio' && (
              <button onClick={onAnular}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-barlow-condensed text-sm tracking-wide border"
                style={{ borderColor: '#333', color: '#888', background: 'transparent' }}>
                Voltar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Botões de gol */}
      <div className="px-4 py-2 mb-5 grid grid-cols-2 gap-2">
        <button onClick={() => setGolDialog({ equipe: 'A', golExistente: null })}
          disabled={matchStatus !== 'em_andamento'}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-35"
          style={{ background: COR_BG[timeA.cor], color: hexA, border: `1px solid ${hexA}40` }}>
          <CirclePlus size={18} /> Gol {timeA.nome}
        </button>
        <button onClick={() => setGolDialog({ equipe: 'B', golExistente: null })}
          disabled={matchStatus !== 'em_andamento'}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-35"
          style={{ background: COR_BG[timeB.cor], color: hexB, border: `1px solid ${hexB}40` }}>
          <CirclePlus size={18} /> Gol {timeB.nome}
        </button>
        {matchStatus === 'pausado' && (
          <div className="col-span-2 text-center font-barlow-condensed text-xs text-muted-foreground py-1">
            Retome a partida para marcar gols
          </div>
        )}
      </div>

      {/* Histórico de gols */}
      <div className="px-4 py-2 mb-3">
        <div className="rounded-xl px-4 py-2" style={{ background: '#141414', border: '1px solid #222' }}>
          <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">
            Histórico de Gols do Dia
          </div>
          {gols.length === 0 && historicoDia.length === 0 ? (
            <div className="font-barlow-condensed text-sm text-muted-foreground text-center py-1 italic">
              Nenhum gol marcado ainda
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {gols.map((g) => (
                <div key={g.id} className="flex items-center gap-2 font-barlow-condensed text-sm">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COR_HEX[g.cor] }} />
                  <div className="flex-1 min-w-0">
                    <span style={{ color: COR_HEX[g.cor] }}>{g.jogadorNome}</span>
                    {g.contra && <span className="text-xs text-muted-foreground ml-1">(contra)</span>}
                    {g.assistNome && <span className="text-xs text-muted-foreground ml-1">· ass: {g.assistNome}</span>}
                  </div>
                  <span className="text-muted-foreground text-xs flex-shrink-0">{g.minuto}</span>
                  <div className="flex items-center gap-2 ml-1">
                    <button
                      onClick={() => setGolDialog({ equipe: g.equipe, golExistente: g })}
                      className="p-1 rounded"
                      title="Editar gol"
                    >
                      <Pencil size={13} className="text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      onClick={() => handleExcluirGol(g.id)}
                      className="p-1 rounded"
                      title="Excluir gol"
                    >
                      <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
              {historicoDia.map((g, i) => (
                <div key={`hist-${i}`} className="flex items-center gap-2 font-barlow-condensed text-sm opacity-50">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COR_HEX[g.cor] }} />
                  <span style={{ color: COR_HEX[g.cor] }}>{g.jogadorNome}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{g.minuto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vitórias do dia */}
      <div className="px-4 py-2 mb-3 grid grid-cols-3 gap-2">
        {[timeA, timeB, ...(timeEspera ? [timeEspera] : [])].map((t) => {
          const hex = COR_HEX[t.cor]
          return (
            <div key={t.id} className="rounded-xl py-1.5 text-center" style={{ background: '#141414', border: '1px solid #222' }}>
              <div className="font-barlow-condensed text-[10px] text-muted-foreground truncate px-1 capitalize">{t.nome}</div>
              <div className="font-bebas text-2xl leading-tight" style={{ color: hex }}>{vitorias[t.id] ?? 0}</div>
              <div className="font-barlow-condensed text-[9px] text-muted-foreground tracking-wide">vitórias</div>
            </div>
          )
        })}
      </div>

      {/* Encerrar / Anular Partida */}
      <div className="px-4 pb-3 flex gap-2">
        <button onClick={() => onEncerrar(golsA, golsB)}
          className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide"
          style={{ background: '#3b82f6', color: '#fff' }}>
          Encerrar Partida
        </button>
        <button onClick={onAnular}
          className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          Anular Partida
        </button>
      </div>

      {golDialog && (
        <GolDialog
          open={!!golDialog}
          onOpenChange={(v) => { if (!v) setGolDialog(null) }}
          equipe={golDialog.equipe}
          timeA={timeA}
          timeB={timeB}
          minuto={getMinuto()}
          golExistente={golDialog.golExistente}
          onSalvar={(dados) => handleSalvarGol(golDialog.equipe, dados, golDialog.golExistente)}
          onExcluir={golDialog.golExistente ? () => handleExcluirGol(golDialog.golExistente!.id) : undefined}
        />
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function AoVivo({ initialData }: { initialData: DashboardData }) {
  const { data } = useSWR<DashboardData>('/api/dashboard', fetcher, {
    refreshInterval: 5000,
    fallbackData: initialData,
  })

  const dia = data?.diaAtivo
  const stats = data?.stats

  type View = 'configurar' | 'partida'
  const [view, setView] = useState<View>('configurar')
  const [timeAId, setTimeAId] = useState<number | null>(null)
  const [timeBId, setTimeBId] = useState<number | null>(null)
  const [vitorias, setVitorias] = useState<Vitorias>({})
  const [historicoDia, setHistoricoDia] = useState<GolEntry[]>([])
  const [rodadasJogadas, setRodadasJogadas] = useState<Record<number, number>>({})
  const [empateDialog, setEmpateDialog] = useState<{ timeA: TimeInfo; timeB: TimeInfo } | null>(null)
  const [encerrarDiaOpen, setEncerrarDiaOpen] = useState(false)
  const [anularDiaOpen, setAnularDiaOpen] = useState(false)
  const [diaFinalizado, setDiaFinalizado] = useState(false)

  useEffect(() => {
    if (dia?.times && Object.keys(vitorias).length === 0) {
      const v: Vitorias = {}
      dia.times.forEach((t) => { v[t.id] = 0 })
      setVitorias(v)
    }
  }, [dia?.times])

  if (!dia) return null

  const timeA = dia.times.find((t) => t.id === timeAId)
  const timeB = dia.times.find((t) => t.id === timeBId)
  const timeEspera = dia.times.find((t) => t.id !== timeAId && t.id !== timeBId)

  function handleConfirmarConfronto(idA: number, idB: number) {
    setTimeAId(idA)
    setTimeBId(idB)
    setView('partida')
  }

  function handleGol(gol: GolEntry) {
    setHistoricoDia((h) => [gol, ...h])
  }

  function handleEncerrar(golsA: number, golsB: number) {
    if (!timeA || !timeB) return

    if (golsA > golsB) setVitorias((v) => ({ ...v, [timeA.id]: (v[timeA.id] ?? 0) + 1 }))
    else if (golsB > golsA) setVitorias((v) => ({ ...v, [timeB.id]: (v[timeB.id] ?? 0) + 1 }))

    const novasRodadas = {
      ...rodadasJogadas,
      [timeA.id]: (rodadasJogadas[timeA.id] ?? 0) + 1,
      [timeB.id]: (rodadasJogadas[timeB.id] ?? 0) + 1,
    }
    setRodadasJogadas(novasRodadas)
    setView('configurar')

    if (golsA === golsB) {
      const rodadasA = novasRodadas[timeA.id] ?? 0
      const rodadasB = novasRodadas[timeB.id] ?? 0
      if (rodadasA === rodadasB) {
        // Primeiro confronto do dia ou rodadas iguais — humanos decidem quem fica
        setEmpateDialog({ timeA, timeB })
      }
      // Se rodadas diferentes, o time com mais rodadas sai — automático
    }
  }

  function handleAnular() {
    setView('configurar')
  }

  function handleEncerrarDia() {
    setDiaFinalizado(true)
    setEncerrarDiaOpen(false)
  }

  function handleAnularDia() {
    const v: Vitorias = {}
    dia.times.forEach((t) => { v[t.id] = 0 })
    setVitorias(v)
    setHistoricoDia([])
    setRodadasJogadas({})
    setView('configurar')
    setAnularDiaOpen(false)
  }

  // ─── Dia Finalizado ───────────────────────────────────────────────────────

  if (diaFinalizado) {
    const timesOrdenados = [...dia.times].sort((a, b) => (vitorias[b.id] ?? 0) - (vitorias[a.id] ?? 0))
    const lider = timesOrdenados[0]
    const temVencedor = (vitorias[lider.id] ?? 0) > (vitorias[timesOrdenados[1].id] ?? 0)
    return (
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#0e0e0e', borderColor: '#2a2a2a' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e1e', background: '#0a0a0a' }}>
          <div className="flex items-center gap-2">
            <Trophy size={15} style={{ color: '#f5c400' }} />
            <span className="font-bebas tracking-widest text-lg" style={{ color: '#f5c400' }}>
              DIA DE JOGO ENCERRADO
            </span>
          </div>
          <Link href={`/dias-de-jogo/${dia.id}`} className="flex items-center gap-1 font-barlow-condensed text-xs tracking-wide text-muted-foreground hover:text-foreground transition-colors">
            Ver dia <ArrowRight size={12} />
          </Link>
        </div>
        <div className="px-4 py-5 space-y-2">
          {timesOrdenados.map((t, i) => {
            const hex = COR_HEX[t.cor]
            const v = vitorias[t.id] ?? 0
            const ehLider = i === 0 && temVencedor
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: '#141414', border: `1px solid ${ehLider ? hex + '40' : '#222'}` }}>
                <span className="font-bebas text-xl w-5 text-center" style={{ color: ehLider ? '#f5c400' : '#444' }}>
                  {i + 1}
                </span>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: hex }} />
                <span className="font-barlow-condensed text-sm flex-1" style={{ color: hex }}>{t.nome}</span>
                <span className="font-bebas text-2xl" style={{ color: ehLider ? '#f5c400' : '#888' }}>{v}</span>
                <span className="font-barlow-condensed text-xs text-muted-foreground">vitórias</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── View principal ───────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0e0e0e', borderColor: '#2a2a2a' }}>
      {view === 'configurar' ? (
        <ConfigurarPartida
          times={dia.times}
          vitorias={vitorias}
          historicoDia={historicoDia}
          diaId={dia.id}
          dataStr={dia.data}
          onConfirmar={handleConfirmarConfronto}
          onEncerrarDia={() => setEncerrarDiaOpen(true)}
          onAnularDia={() => setAnularDiaOpen(true)}
        />
      ) : timeA && timeB ? (
        <PartidaEmAndamento
          timeA={timeA}
          timeB={timeB}
          timeEspera={timeEspera}
          vitorias={vitorias}
          historicoDia={historicoDia}
          onEncerrar={handleEncerrar}
          onAnular={handleAnular}
          onGol={handleGol}
        />
      ) : null}

      {/* Stats do ciclo */}
      {stats && (stats.artilheiro || stats.liderPasse || stats.liderFoto) && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-3 gap-2 border-t" style={{ borderColor: '#1e1e1e' }}>
          {[
            { label: 'Artilharia', stat: stats.artilheiro, sufixo: 'g' },
            { label: 'Passes',     stat: stats.liderPasse, sufixo: 'a' },
            { label: 'Fotos',      stat: stats.liderFoto,  sufixo: 'v' },
          ].map(({ label, stat, sufixo }) => stat && (
            <div key={label} className="rounded-xl py-2 px-2 text-center mt-3" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
              <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">{label}</div>
              <div className="font-barlow-condensed text-xs font-semibold text-foreground truncate mt-0.5">{stat.nome}</div>
              <div className="font-bebas text-xl leading-tight" style={{ color: '#f5c400' }}>{stat.valor}{sufixo}</div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Empate — quem fica em campo? */}
      <Dialog open={!!empateDialog} onOpenChange={(v) => { if (!v) setEmpateDialog(null) }}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl">Empate!</DialogTitle>
          </DialogHeader>
          {empateDialog && (
            <div className="space-y-4 pt-1">
              <p className="font-barlow-condensed text-sm text-muted-foreground">
                Rodadas iguais — decidam quem fica em campo para o próximo confronto.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmpateDialog(null)}
                  className="flex-1 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide border-2"
                  style={{
                    borderColor: COR_HEX[empateDialog.timeA.cor],
                    color: COR_HEX[empateDialog.timeA.cor],
                    background: COR_BG[empateDialog.timeA.cor],
                  }}
                >
                  {empateDialog.timeA.nome} fica
                </button>
                <button
                  onClick={() => setEmpateDialog(null)}
                  className="flex-1 py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide border-2"
                  style={{
                    borderColor: COR_HEX[empateDialog.timeB.cor],
                    color: COR_HEX[empateDialog.timeB.cor],
                    background: COR_BG[empateDialog.timeB.cor],
                  }}
                >
                  {empateDialog.timeB.nome} fica
                </button>
              </div>
              <p className="font-barlow-condensed text-xs text-muted-foreground text-center">
                Após decidir, configure o próximo confronto.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Encerrar Dia de Jogo */}
      <Dialog open={encerrarDiaOpen} onOpenChange={setEncerrarDiaOpen}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl">Encerrar Dia de Jogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm text-muted-foreground">Placar final do dia:</p>
            <div className="space-y-2">
              {[...dia.times]
                .sort((a, b) => (vitorias[b.id] ?? 0) - (vitorias[a.id] ?? 0))
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COR_HEX[t.cor] }} />
                    <span className="font-barlow-condensed text-sm flex-1" style={{ color: COR_HEX[t.cor] }}>{t.nome}</span>
                    <span className="font-bebas text-xl" style={{ color: '#f5c400' }}>{vitorias[t.id] ?? 0}</span>
                    <span className="font-barlow-condensed text-xs text-muted-foreground">vitórias</span>
                  </div>
                ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleEncerrarDia}
                className="flex-1 font-barlow-condensed tracking-wide"
                style={{ background: '#22c55e', color: '#000', border: 'none' }}
              >
                Confirmar Encerramento
              </Button>
              <Button
                variant="outline"
                onClick={() => setEncerrarDiaOpen(false)}
                className="font-barlow-condensed tracking-wide"
                style={{ borderColor: '#444', color: '#888' }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anular Dia de Jogo */}
      <Dialog open={anularDiaOpen} onOpenChange={setAnularDiaOpen}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl">Anular Dia de Jogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm text-muted-foreground">
              Tem certeza? Todos os resultados do dia serão descartados e o placar zerado.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleAnularDia}
                className="flex-1 font-barlow-condensed tracking-wide"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                Anular Dia
              </Button>
              <Button
                variant="outline"
                onClick={() => setAnularDiaOpen(false)}
                className="flex-1 font-barlow-condensed tracking-wide"
                style={{ borderColor: '#444', color: '#888' }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
