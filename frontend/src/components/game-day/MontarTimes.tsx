'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shuffle, ChevronDown, ArrowLeft, Plus, Minus, X } from 'lucide-react'
import type { Jogador, TimeFormado } from './DiaDeJogoFlow'

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

const CORES: { valor: CorTime; label: string; hex: string }[] = [
  { valor: 'vermelho', label: 'Vermelho', hex: '#ef4444' },
  { valor: 'azul',     label: 'Azul',     hex: '#3b82f6' },
  { valor: 'verde',    label: 'Verde',     hex: '#22c55e' },
  { valor: 'laranja',  label: 'Laranja',   hex: '#f97316' },
]

const DEFAULT_CORES: CorTime[] = ['vermelho', 'azul', 'verde']

type TimeState = { nome: string; cor: CorTime; jogadores: Jogador[] }

interface Props {
  diaId: number
  data: string
  jogadoresSelecionados: Jogador[]
  timesIniciais: TimeFormado[]
  onFechar: (times: TimeFormado[]) => Promise<void>
  onVoltar: () => void
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function distribuir(jogadores: Jogador[]): [Jogador[], Jogador[], Jogador[]] {
  const s = [...jogadores].sort(() => Math.random() - 0.5)
  const base = Math.floor(s.length / 3)
  const r = s.length % 3
  const t1 = base + (r > 0 ? 1 : 0)
  const t2 = base + (r > 1 ? 1 : 0)
  return [s.slice(0, t1), s.slice(t1, t1 + t2), s.slice(t1 + t2)]
}

function getCor(valor: CorTime) {
  return CORES.find((c) => c.valor === valor)!
}

function timesFromIniciais(iniciais: TimeFormado[], padroes: CorTime[]): TimeState[] {
  if (iniciais.length === 3) {
    return iniciais.map((t) => ({ nome: t.nome, cor: t.cor as CorTime, jogadores: t.jogadores }))
  }
  return [
    { nome: 'Time A', cor: padroes[0], jogadores: [] },
    { nome: 'Time B', cor: padroes[1], jogadores: [] },
    { nome: 'Time C', cor: padroes[2], jogadores: [] },
  ]
}

export function MontarTimes({ data, jogadoresSelecionados, timesIniciais, onFechar, onVoltar }: Props) {
  const [times, setTimes] = useState<TimeState[]>(() => timesFromIniciais(timesIniciais, DEFAULT_CORES))
  const [adicionandoAoTime, setAdicionandoAoTime] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  const totalDistribuidos = times.reduce((s, t) => s + t.jogadores.length, 0)
  const todosDistribuidos = totalDistribuidos === jogadoresSelecionados.length && jogadoresSelecionados.length > 0
  const coresUsadas = times.map((t) => t.cor)

  const idsNoTime = new Set(times.flatMap((t) => t.jogadores.map((j) => j.id)))
  const disponiveis = jogadoresSelecionados.filter((j) => !idsNoTime.has(j.id))

  function sortear() {
    const [g1, g2, g3] = distribuir(jogadoresSelecionados)
    setTimes((prev) => [
      { ...prev[0], jogadores: g1 },
      { ...prev[1], jogadores: g2 },
      { ...prev[2], jogadores: g3 },
    ])
    setAdicionandoAoTime(null)
  }

  function setCor(timeIdx: number, cor: CorTime) {
    setTimes((prev) => prev.map((t, i) => (i === timeIdx ? { ...t, cor } : t)))
  }

  function adicionarJogador(timeIdx: number, jogador: Jogador) {
    setTimes((prev) =>
      prev.map((t, i) => (i === timeIdx ? { ...t, jogadores: [...t.jogadores, jogador] } : t))
    )
    // Fecha o painel se todos foram distribuídos
    const restantes = disponiveis.filter((j) => j.id !== jogador.id)
    if (restantes.length === 0) setAdicionandoAoTime(null)
  }

  function removerJogador(timeIdx: number, jogadorId: number) {
    setTimes((prev) =>
      prev.map((t, i) =>
        i === timeIdx ? { ...t, jogadores: t.jogadores.filter((j) => j.id !== jogadorId) } : t
      )
    )
  }

  async function fecharTimes() {
    if (!todosDistribuidos) { toast.error('Distribua todos os jogadores antes de fechar'); return }
    setSalvando(true)
    try {
      await onFechar(times)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-widest leading-none capitalize">
          {data ? formatData(data) : 'Confronto'}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-lg font-barlow-condensed text-xs tracking-wide"
            style={{ background: 'rgba(245,196,0,0.1)', color: '#f5c400', border: '1px solid rgba(245,196,0,0.2)' }}
          >
            Passo 2 de 3
          </div>
          <span className="font-barlow-condensed text-sm text-muted-foreground">Montando os times</span>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onVoltar}
            className="flex items-center gap-1.5 font-barlow-condensed text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Editar lista
          </button>
          <span className="font-barlow-condensed text-sm text-muted-foreground">
            {totalDistribuidos}/{jogadoresSelecionados.length} distribuídos
          </span>
          {disponiveis.length > 0 && (
            <span className="font-barlow-condensed text-xs" style={{ color: '#f87171' }}>
              {disponiveis.length} sem time
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={sortear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-barlow-condensed text-sm tracking-wide border transition-colors"
            style={{ background: '#111111', borderColor: '#333', color: '#f0ede0' }}
          >
            <Shuffle size={14} />
            Sortear
          </button>
          <button
            onClick={fecharTimes}
            disabled={!todosDistribuidos || salvando}
            className="px-5 py-2 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-30"
            style={{ background: '#f5c400', color: '#000' }}
          >
            {salvando ? 'Fechando...' : 'Fechar Times'}
          </button>
        </div>
      </div>

      {/* 3 times */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {times.map((time, tIdx) => {
          const cor = getCor(time.cor)
          const coresDisponiveis = CORES.filter((c) => c.valor === time.cor || !coresUsadas.includes(c.valor))
          const mostrandoAdd = adicionandoAoTime === tIdx

          return (
            <div
              key={tIdx}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: mostrandoAdd ? `${cor.hex}80` : `${cor.hex}40`, background: '#111111' }}
            >
              {/* Header */}
              <div
                className="px-3 py-2.5 flex items-center gap-2"
                style={{ background: `${cor.hex}18`, borderBottom: `1px solid ${cor.hex}30` }}
              >
                <span className="font-bebas tracking-widest text-lg flex-1" style={{ color: cor.hex }}>
                  {time.nome}
                </span>

                {/* Seletor de cor */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 font-barlow-condensed text-xs tracking-wide rounded-lg px-2 py-1 hover:bg-black/20">
                    <div className="w-3 h-3 rounded-full" style={{ background: cor.hex }} />
                    <span style={{ color: cor.hex }}>{cor.label}</span>
                    <ChevronDown size={11} style={{ color: cor.hex }} />
                  </button>
                  <div
                    className="absolute right-0 top-full mt-1 rounded-lg border py-1 z-10 hidden group-focus-within:block group-hover:block"
                    style={{ background: '#1a1a1a', borderColor: '#333', minWidth: '120px' }}
                  >
                    {coresDisponiveis.map((c) => (
                      <button
                        key={c.valor}
                        onClick={() => setCor(tIdx, c.valor)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 font-barlow-condensed text-xs tracking-wide hover:bg-white/5 text-left"
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.hex }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão + */}
                <button
                  onClick={() => setAdicionandoAoTime(mostrandoAdd ? null : tIdx)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    border: `2px solid ${cor.hex}`,
                    color: mostrandoAdd ? '#000' : cor.hex,
                    background: mostrandoAdd ? cor.hex : 'transparent',
                  }}
                  title={mostrandoAdd ? 'Fechar' : 'Adicionar jogador'}
                >
                  {mostrandoAdd
                    ? <X size={13} strokeWidth={2.5} />
                    : <Plus size={14} strokeWidth={2.5} />
                  }
                </button>
              </div>

              {/* Jogadores do time */}
              <div className="p-2 space-y-1">
                {time.jogadores.length === 0 && !mostrandoAdd && (
                  <div
                    className="flex items-center justify-center h-[72px] font-barlow-condensed text-xs text-muted-foreground rounded-lg"
                    style={{ border: '1px dashed #2a2a2a' }}
                  >
                    Use + ou Sortear
                  </div>
                )}
                {time.jogadores.map((jogador) => (
                  <div
                    key={jogador.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg font-barlow-condensed text-sm group"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cor.hex }} />
                    <span className="flex-1 truncate text-foreground">{jogador.nome}</span>
                    {jogador.convidado && (
                      <span
                        className="text-[9px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}
                      >
                        G
                      </span>
                    )}
                    <button
                      onClick={() => removerJogador(tIdx, jogador.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ border: '1px solid #555', color: '#888' }}
                      title="Remover do time"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#f87171'
                        e.currentTarget.style.color = '#f87171'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#555'
                        e.currentTarget.style.color = '#888'
                      }}
                    >
                      <Minus size={10} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Painel inline de jogadores disponíveis */}
              {mostrandoAdd && (
                <div style={{ borderTop: `1px solid ${cor.hex}30` }}>
                  <div
                    className="px-3 py-2 font-barlow-condensed text-[11px] tracking-widest uppercase"
                    style={{ color: cor.hex, background: `${cor.hex}08` }}
                  >
                    Adicionar ao time
                  </div>
                  {disponiveis.length === 0 ? (
                    <div className="px-4 py-4 font-barlow-condensed text-xs text-muted-foreground text-center">
                      Todos distribuídos
                    </div>
                  ) : (
                    <div className="p-2 space-y-1 max-h-52 overflow-y-auto">
                      {disponiveis.map((j) => (
                        <button
                          key={j.id}
                          onClick={() => adicionarJogador(tIdx, j)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors font-barlow-condensed text-sm"
                          style={{ background: 'transparent' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = `${cor.hex}12`)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Plus size={13} style={{ color: cor.hex, flexShrink: 0 }} />
                          <span className="flex-1 text-foreground">{j.nome}</span>
                          {j.apelido && (
                            <span className="text-muted-foreground text-xs">({j.apelido})</span>
                          )}
                          {j.convidado && (
                            <span
                              className="text-[9px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}
                            >
                              G
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="px-3 py-2 font-barlow-condensed text-[11px] text-muted-foreground" style={{ borderTop: `1px solid #1a1a1a` }}>
                {time.jogadores.length} jogador{time.jogadores.length !== 1 ? 'es' : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
