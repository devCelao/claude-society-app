'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trophy, Play, Pause, RotateCcw, CheckCircle2, XCircle, Flag, AlertTriangle, ImageDown, Pencil, X, Check, ChevronDown } from 'lucide-react'
import { toBlob } from 'html-to-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PartidaAuditoria } from '@/components/partidas/PartidaAuditoria'
import { getCorTime, COR_NEUTRA } from '@/lib/cores-time'
import { ImagemTimes, type PosicaoImagem } from '@/components/game-day/ImagemTimes'

// ─── Tipos ───────────────────────────────────────────────────────────────────


const DURACAO_MS = 7 * 60 * 1000

type Jogador = { id: number; nome: string; apelido: string | null; convidado: boolean; posicaoPrimaria?: PosicaoImagem }
type TimeData = { id: number; nome: string; cor: string; jogadores: Jogador[] }
type GolData = {
  id: number; timeId: number; jogadorId: number; jogadorNome: string; golContra?: boolean
  assistenciaJogadorId: number | null; assistenciaJogadorNome: string | null
}
type PartidaData = {
  id: number; timeAId: number; timeBId: number
  timeANome: string; timeBNome: string; timeACor: string; timeBCor: string
  status: string; createdAt: string; inicioEm: string | null; timerAcumuladoMs: number; vencedorId: number | null
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
    if (g.golContra) return // conta no placar, nao na artilharia
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
  const hex = getCorTime(time.cor).hex
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
  onConfirm: (jogadorId: number, assistId: number | null, golContra: boolean) => void; saving: boolean
}) {
  const { hex, texto } = getCorTime(teamCor)
  const [jogadorId, setJogadorId] = useState('')
  const [assistId, setAssistId] = useState('')
  const [golContra, setGolContra] = useState(false)
  useEffect(() => { if (!open) { setJogadorId(''); setAssistId(''); setGolContra(false) } }, [open])
  // Gol contra: autor e do time adversario (marcou contra o proprio time); sem assistencia
  const autores = golContra ? otherPlayers : teamPlayers
  const assistPool = teamPlayers.filter((j) => String(j.id) !== jogadorId)
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
        {/* Cabecalho: titulo + "Gol contra" na mesma linha (pr-8 reserva o botao fechar) */}
        <DialogHeader className="flex-row items-center gap-2 pr-8">
          <DialogTitle className="font-bebas tracking-widest text-2xl flex-1 min-w-0 truncate">
            <span style={{ color: golContra ? '#fb923c' : hex }}>{golContra ? 'GOL CONTRA' : 'GOL!'}</span>
            <span className="text-muted-foreground text-base font-barlow-condensed tracking-wide normal-case ml-2">{teamName}</span>
          </DialogTitle>
          <label
            className="flex items-center gap-2 h-10 px-2.5 rounded-xl cursor-pointer select-none font-barlow-condensed text-sm flex-shrink-0"
            style={{
              background: golContra ? 'rgba(251,146,60,0.1)' : '#1a1a1a',
              border: `1px solid ${golContra ? 'rgba(251,146,60,0.4)' : '#333'}`,
              color: golContra ? '#fb923c' : '#f0ede0',
            }}
          >
            <input
              type="checkbox"
              checked={golContra}
              onChange={(e) => { setGolContra(e.target.checked); setJogadorId(''); setAssistId('') }}
              className="w-4 h-4 flex-shrink-0"
              style={{ accentColor: '#fb923c' }}
            />
            Gol contra
          </label>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="font-barlow-condensed text-sm text-foreground">
              Quem marcou?{golContra && <span className="text-xs ml-1" style={{ color: '#fb923c' }}>(jogador adversário)</span>}
            </label>
            <select value={jogadorId} onChange={(e) => { setJogadorId(e.target.value); setAssistId('') }}
              className="w-full px-3 py-2.5 rounded-xl font-barlow-condensed text-sm focus:outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #333', color: jogadorId ? '#f0ede0' : '#666' }}>
              <option value="">Selecione o jogador</option>
              {autores.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
            </select>
          </div>
          {!golContra && (
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
          )}
          <div className="flex gap-2 pt-1">
            <Button onClick={() => onConfirm(Number(jogadorId), golContra ? null : (assistId ? Number(assistId) : null), golContra)}
              disabled={!jogadorId || saving} className="flex-1 font-barlow-condensed tracking-wide"
              style={{ background: hex, color: texto, border: 'none' }}>
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

function StatsDia({ diaId, partidas, times, victories, jogadores, onAlterado }: {
  diaId: number; partidas: PartidaData[]; times: TimeData[]
  victories: Record<number, number>; jogadores: { nome: string; gols: number; assists: number }[]
  onAlterado: () => void
}) {
  const finished = partidas.filter((p) => p.status === 'FINALIZADA')
  // null = acompanha sempre a ultima partida encerrada
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null)
  const ultima = finished[finished.length - 1]
  const selecionada = finished.find((p) => p.id === selecionadaId) ?? ultima
  const [listaAberta, setListaAberta] = useState(false)
  // Vencedor na cor do time; perdedor e empate em branco (cor neutra reservada)
  const descreverPartida = (p: PartidaData) => {
    const golsA = p.gols.filter((g) => g.timeId === p.timeAId).length
    const golsB = p.gols.filter((g) => g.timeId === p.timeBId).length
    const corA = p.vencedorId === p.timeAId ? getCorTime(p.timeACor).hex : COR_NEUTRA
    const corB = p.vencedorId === p.timeBId ? getCorTime(p.timeBCor).hex : COR_NEUTRA
    return (
      <span className="truncate">
        <span className="text-muted-foreground">P{finished.indexOf(p) + 1} · </span>
        <span style={{ color: corA }}>{p.timeANome}</span>
        <span className="font-semibold mx-2" style={{ color: COR_NEUTRA }}>{golsA}<span className="mx-1">×</span>{golsB}</span>
        <span style={{ color: corB }}>{p.timeBNome}</span>
      </span>
    )
  }

  const tempoEmCampoMs: Record<number, number> = {}
  finished.forEach((p) => {
    tempoEmCampoMs[p.timeAId] = (tempoEmCampoMs[p.timeAId] ?? 0) + p.timerAcumuladoMs
    tempoEmCampoMs[p.timeBId] = (tempoEmCampoMs[p.timeBId] ?? 0) + p.timerAcumuladoMs
  })
  const formatTempoCampo = (ms: number) => {
    const totalSeg = Math.floor(ms / 1000)
    return `${String(Math.floor(totalSeg / 60)).padStart(2, '0')}:${String(totalSeg % 60).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground">Placar do dia</p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((t) => {
          const hex = getCorTime(t.cor).hex
          return (
            <div key={t.id} className="rounded-xl py-3 text-center" style={{ background: '#141414', border: '1px solid #222' }}>
              <div className="font-barlow-condensed text-xs text-muted-foreground capitalize truncate px-2">{t.nome}</div>
              <div className="font-bebas text-4xl" style={{ color: hex }}>{victories[t.id] ?? 0}</div>
              <div className="font-barlow-condensed text-[10px] text-muted-foreground">vitórias</div>
              <div className="font-barlow-condensed text-[10px] tabular-nums mt-1" style={{ color: hex }}>
                {formatTempoCampo(tempoEmCampoMs[t.id] ?? 0)} em campo
              </div>
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
      {selecionada && (
        <div className="space-y-2">
          <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">Partidas do dia</div>
          {/* Lista suspensa propria: o <select> nativo nao permite colorir parte do texto */}
          <div className="relative">
            <button
              onClick={() => setListaAberta((v) => !v)}
              aria-expanded={listaAberta}
              className="w-full min-h-11 flex items-center gap-2 px-3 py-2.5 rounded-xl font-barlow-condensed text-sm text-left"
              style={{ background: '#141414', border: '1px solid #222' }}
            >
              <span className="flex-1 min-w-0 flex">{descreverPartida(selecionada)}</span>
              <ChevronDown size={16} className="flex-shrink-0 text-muted-foreground" />
            </button>
            {listaAberta && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setListaAberta(false)} />
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border py-1 max-h-72 overflow-y-auto"
                  style={{ background: '#1a1a1a', borderColor: '#333' }}
                >
                  {[...finished].reverse().map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelecionadaId(p.id === ultima.id ? null : p.id)
                        setListaAberta(false)
                      }}
                      className="w-full min-h-11 flex items-center px-3 font-barlow-condensed text-sm text-left hover:bg-white/5"
                      style={{ background: p.id === selecionada.id ? 'rgba(245,196,0,0.08)' : 'transparent' }}
                    >
                      {descreverPartida(p)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {selecionada.id !== ultima.id && (
            <p className="font-barlow-condensed text-[11px] text-muted-foreground px-1">
              Alterar o resultado desta partida não muda as partidas seguintes.
            </p>
          )}
          <PartidaAuditoria key={selecionada.id} diaId={diaId} partida={{ id: selecionada.id }} times={times} onAlterado={onAlterado} />
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AoVivo({ diaId, data, cicloNome, times, partidas }: Props) {
  const router = useRouter()

  const [gerandoImagem, setGerandoImagem] = useState(false)
  const capturaRef = useRef<HTMLDivElement>(null)

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
      backgroundColor: '#0a0a0a',
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
      const nomeArquivo = `times-${data}.png`
      const file = new File([blob], nomeArquivo, { type: 'image/png' })

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Times do dia' })
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

  const [phase, setPhase] = useState<GamePhase>(() => derivePhase(partidas, times))
  const [localGols, setLocalGols] = useState<GolData[]>(() => {
    const last = partidas[partidas.length - 1]
    return last?.status === 'EM_ANDAMENTO' ? last.gols : []
  })
  const [golDialog, setGolDialog] = useState<{ equipe: 'A' | 'B' } | null>(null)
  const [savingGol, setSavingGol] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmAnular, setConfirmAnular] = useState(false)
  const [confirmEncerrar, setConfirmEncerrar] = useState(false)
  const [editAssistGolId, setEditAssistGolId] = useState<number | null>(null)
  const [assistValue, setAssistValue] = useState('')
  const [golBusy, setGolBusy] = useState(false)

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

  // ── Relógio de parede (não pausa nunca) — usado no "tempo desde o início" ──
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (partidas.length === 0) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [partidas.length])

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
  const lastVencedorId = partidas[partidas.length - 1]?.vencedorId ?? null
  const lastGolsCount = partidas[partidas.length - 1]?.gols.length ?? 0
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
  }, [lastId, lastStatus, partidas.length, lastVencedorId, lastGolsCount]) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleGolConfirm(jogadorId: number, assistId: number | null, golContra: boolean) {
    if (phase.type !== 'jogando' || !golDialog) return
    const timeId = golDialog.equipe === 'A' ? phase.timeAId : phase.timeBId
    setSavingGol(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}/gols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jogadorId, timeId, assistenciaJogadorId: assistId, golContra }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao marcar gol'); return }
      const body = await res.json()
      setLocalGols((prev) => [...prev, {
        id: body.id, timeId, jogadorId, jogadorNome: body.jogadorNome, golContra,
        assistenciaJogadorId: assistId, assistenciaJogadorNome: body.assistenciaNome ?? null,
      }])
      setGolDialog(null)
      toast.success(golContra
        ? `Gol contra de ${body.jogadorNome}`
        : `Gol de ${body.jogadorNome}!${body.assistenciaNome ? ` Assist.: ${body.assistenciaNome}` : ''}`)
    } finally { setSavingGol(false) }
  }

  async function handleDeleteGolLive(golId: number) {
    if (phase.type !== 'jogando') return
    setGolBusy(true)
    try {
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}/gols/${golId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao remover gol'); return }
      setLocalGols((prev) => prev.filter((g) => g.id !== golId))
      toast.success('Gol removido')
    } finally { setGolBusy(false) }
  }

  async function handleSalvarAssistLive(golId: number) {
    if (phase.type !== 'jogando') return
    setGolBusy(true)
    try {
      const assistId = assistValue === '' || assistValue === 'none' ? null : parseInt(assistValue, 10)
      const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${phase.partidaId}/gols/${golId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistenciaJogadorId: assistId }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Erro ao salvar assistencia'); return }
      const body = await res.json()
      setLocalGols((prev) => prev.map((g) =>
        g.id === golId ? { ...g, assistenciaJogadorId: body.assistenciaJogadorId, assistenciaJogadorNome: body.assistenciaNome } : g
      ))
      setEditAssistGolId(null)
      toast.success('Assistencia atualizada')
    } finally { setGolBusy(false) }
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
    } finally { setBusy(false); setConfirmEncerrar(false) }
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

  // ── Tempo em campo (soma do tempo de cronômetro de todas as partidas do dia) ──
  const tempoEmCampoTotalMs = partidas.reduce((acc, p) => {
    if (phase.type === 'jogando' && p.id === phase.partidaId) {
      const emAndamento = timerState === 'rodando' && inicioRodadaEm ? Date.now() - inicioRodadaEm.getTime() : 0
      return acc + acumuladoMs + emAndamento
    }
    return acc + (p.timerAcumuladoMs ?? 0)
  }, 0)

  // ── Tempo desde o início do primeiro jogo (relógio de parede, não pausa) ──
  const tempoDesdeInicioMs = partidas.length > 0
    ? Math.max(0, nowMs - new Date(partidas[0].createdAt).getTime())
    : 0

  function formatTempo(ms: number): string {
    const totalSeg = Math.floor(ms / 1000)
    const h = Math.floor(totalSeg / 3600)
    const m = Math.floor((totalSeg % 3600) / 60)
    const s = totalSeg % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ── Render ──

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho + ações do confronto (encerrar/anular pedem confirmação) ── */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
          <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
            AO VIVO
          </h1>
          {cicloNome && (
            <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
              Ciclo: <span style={{ color: '#f5c400', fontWeight: 600 }}>{cicloNome}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-3 flex-shrink-0">
          {partidas.length > 0 && (
            <button onClick={() => setConfirmEncerrar(true)} disabled={busy}
              aria-label="Encerrar confronto" title="Encerrar confronto"
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Flag size={18} />
            </button>
          )}
          <button onClick={() => setConfirmAnular(true)} disabled={busy}
            aria-label="Anular confronto" title="Anular confronto"
            className="w-11 h-11 rounded-xl flex items-center justify-center border transition-colors disabled:opacity-40"
            style={{ borderColor: '#333', color: '#777', background: 'transparent' }}>
            <XCircle size={18} />
          </button>
        </div>
      </div>

      {/* ── Tempo em campo / Tempo desde o início ── */}
      {partidas.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl"
            style={{ background: '#111', border: '1px solid #242424' }}>
            <span className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">
              Tempo em campo
            </span>
            <span className="font-bebas text-xl tabular-nums tracking-widest" style={{ color: '#f5c400' }}>
              {formatTempo(tempoEmCampoTotalMs)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl"
            style={{ background: '#111', border: '1px solid #242424' }}>
            <span className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">
              Desde o início
            </span>
            <span className="font-bebas text-xl tabular-nums tracking-widest" style={{ color: '#f5c400' }}>
              {formatTempo(tempoDesdeInicioMs)}
            </span>
            <span className="font-barlow-condensed text-[10px] tabular-nums text-muted-foreground">
              começou às {new Date(partidas[0].createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

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

          {/* Captura de imagem dos times (nó fora de tela; ver DiaDeJogoMain
              e CicloRanking para o motivo do wrapper carregar o posicionamento
              em vez do próprio nó capturado) */}
          <div
            className={gerandoImagem ? 'block' : 'hidden'}
            style={gerandoImagem ? { position: 'fixed', top: 0, left: -9999 } : undefined}
          >
            <ImagemTimes ref={capturaRef} times={times} data={data} cicloNome={cicloNome} />
          </div>

          <div className="space-y-3">
            <button onClick={() => setPhase({ type: 'configurando' })} disabled={busy}
              className="w-full py-4 rounded-xl font-bebas text-2xl tracking-widest disabled:opacity-40"
              style={{ background: '#f5c400', color: '#000' }}>
              INICIAR JOGO
            </button>
            <button onClick={handleCopiarImagem} disabled={gerandoImagem}
              className="w-full py-2.5 rounded-xl font-barlow-condensed text-sm tracking-wide disabled:opacity-40"
              style={{ background: 'rgba(245,196,0,0.1)', color: '#f5c400', border: '1px solid rgba(245,196,0,0.25)' }}>
              <ImageDown size={14} className={`inline mr-1.5 ${gerandoImagem ? 'animate-pulse' : ''}`} />
              {gerandoImagem ? 'Gerando...' : 'Copiar imagem'}
            </button>
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
        const hexA = getCorTime(timeA.cor).hex
        const hexB = getCorTime(timeB.cor).hex
        const bgA = getCorTime(timeA.cor).bg
        const bgB = getCorTime(timeB.cor).bg

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
                  <div className="w-2 h-2 rounded-full" style={{ background: getCorTime(timeEspera.cor).hex }} />
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

            {/* Gols recentes — editar assistência / remover gol */}
            {localGols.length > 0 && (
              <div className="px-4 pb-3">
                <div className="rounded-xl px-3 py-2.5 space-y-2" style={{ background: '#0a0a0a' }}>
                  <div className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground">Gols</div>
                  {[...localGols].reverse().map((g) => {
                    const hex = g.timeId === phase.timeAId ? hexA : hexB
                    const isEditando = editAssistGolId === g.id
                    const jogadoresDoTime = getTime(g.timeId).jogadores.filter((j) => j.id !== g.jogadorId)
                    return (
                      <div key={g.id} className="space-y-1">
                        <div className="flex items-center gap-2 font-barlow-condensed text-xs">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: hex }} />
                          <span className="flex-1" style={{ color: hex }}>
                            {g.jogadorNome}
                            {g.golContra && <span className="ml-1.5 text-[10px] tracking-wide" style={{ color: '#fb923c' }}>(contra)</span>}
                          </span>
                          {g.assistenciaJogadorNome && !isEditando && (
                            <span className="text-muted-foreground">→ {g.assistenciaJogadorNome}</span>
                          )}
                          {!g.golContra && <button
                            onClick={() => {
                              setEditAssistGolId(isEditando ? null : g.id)
                              setAssistValue(g.assistenciaJogadorId ? String(g.assistenciaJogadorId) : '')
                            }}
                            disabled={golBusy}
                            title="Editar assistência"
                            className="p-1 rounded flex-shrink-0"
                            style={{ color: g.assistenciaJogadorNome ? '#3b82f6' : '#444' }}
                          >
                            <Pencil size={11} />
                          </button>}
                          <button
                            onClick={() => handleDeleteGolLive(g.id)}
                            disabled={golBusy}
                            title="Remover gol"
                            className="p-1 rounded flex-shrink-0"
                            style={{ color: '#444' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {isEditando && (
                          <div className="pl-[14px] flex items-center gap-2">
                            <Select value={assistValue} onValueChange={(v) => setAssistValue(v ?? '')}>
                              <SelectTrigger className="h-7 text-xs flex-1 min-w-0" style={{ fontSize: '12px' }}>
                                <SelectValue placeholder="Sem assistência">
                                  {(value) =>
                                    value && value !== 'none'
                                      ? jogadoresDoTime.find((j) => String(j.id) === String(value))?.nome ?? 'Sem assistência'
                                      : 'Sem assistência'
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Sem assistência</SelectItem>
                                {jogadoresDoTime.map((j) => (
                                  <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => handleSalvarAssistLive(g.id)}
                              disabled={golBusy}
                              className="p-1.5 rounded flex-shrink-0"
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                              title="Confirmar"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditAssistGolId(null)}
                              className="p-1.5 rounded flex-shrink-0"
                              style={{ color: '#555' }}
                              title="Cancelar"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
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
        const hexV = getCorTime(vencedor.cor).hex
        const hexP = getCorTime(perdedor.cor).hex
        const hexPr = getCorTime(proximo.cor).hex
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
            <button onClick={() => handleConfirmarPartida(phase.vencedorId, phase.prevWaitingId)} disabled={busy}
              className="w-full py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40"
              style={{ background: '#f5c400', color: '#000' }}>
              {busy ? 'Criando...' : 'Iniciar Próxima Partida'}
            </button>
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
                <span style={{ color: getCorTime(timeEspera.cor).hex }}>{timeEspera.nome}</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[timeA, timeB].map((t) => {
                const hex = getCorTime(t.cor).hex
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
        <StatsDia diaId={diaId} partidas={partidas} times={times} victories={stats.victories} jogadores={stats.jogadores}
          onAlterado={() => router.refresh()} />
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

      {/* ── Confirmar Encerrar ── */}
      <Dialog open={confirmEncerrar} onOpenChange={setConfirmEncerrar}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
              Encerrar confronto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm leading-relaxed" style={{ color: '#f0ede0' }}>
              {partidas.filter((p) => p.status === 'FINALIZADA').length} partida(s) finalizada(s) neste confronto.
              O dia será encerrado e os resultados entram no ranking.
            </p>
            {phase.type === 'jogando' && (
              <p className="font-barlow-condensed text-sm leading-relaxed" style={{ color: '#fb923c' }}>
                A partida em andamento será encerrada sem vencedor.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleEncerrarDia} disabled={busy} className="font-barlow-condensed tracking-wide"
                style={{ background: '#22c55e', color: '#000' }}>
                {busy ? 'Encerrando...' : 'Sim, encerrar'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmEncerrar(false)} className="font-barlow-condensed">Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          const hex = getCorTime(t.cor).hex
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
          <div className="w-2 h-2 rounded-full" style={{ background: getCorTime(waiting.cor).hex }} />
          <span><strong style={{ color: getCorTime(waiting.cor).hex }}>{waiting.nome}</strong> aguarda</span>
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
