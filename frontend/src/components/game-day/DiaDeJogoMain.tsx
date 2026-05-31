'use client'

import { useState } from 'react'
import { Users, Pencil, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TimeFormado, Partida } from './DiaDeJogoFlow'

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

const COR_HEX: Record<CorTime, string> = {
  vermelho: '#ef4444',
  azul:     '#3b82f6',
  verde:    '#22c55e',
  laranja:  '#f97316',
}

interface Props {
  diaId: number
  data: string
  times: TimeFormado[]
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  partidas: Partida[]
  onEditarTimes: () => Promise<void>
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DiaDeJogoMain({ data, times, status, partidas, onEditarTimes }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editando, setEditando] = useState(false)

  const totalJogadores = times.reduce((s, t) => s + t.jogadores.length, 0)

  const algumJogoIniciado = partidas.some(
    (p) => p.status === 'EM_ANDAMENTO' || p.status === 'FINALIZADA'
  )
  const todosJogosFinalizados =
    partidas.length > 0 && partidas.every((p) => p.status === 'FINALIZADA')

  const podeEditar = status !== 'FINALIZADO' && !todosJogosFinalizados

  function handleEditarClick() {
    if (algumJogoIniciado) {
      setConfirmOpen(true)
    } else {
      onEditarTimes()
    }
  }

  async function confirmarEdicao() {
    setConfirmOpen(false)
    setEditando(true)
    try {
      await onEditarTimes()
    } finally {
      setEditando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-widest leading-none capitalize">
          {formatData(data)}
        </h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-barlow-condensed text-xs tracking-wide"
            style={
              status === 'FINALIZADO'
                ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
                : { background: 'rgba(245,196,0,0.1)', color: '#f5c400', border: '1px solid rgba(245,196,0,0.2)' }
            }
          >
            {status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento'}
          </div>
          <span className="font-barlow-condensed text-sm text-muted-foreground flex items-center gap-1.5">
            <Users size={13} />
            {totalJogadores} jogadores
          </span>

          {/* Botão editar times */}
          {podeEditar && (
            <button
              onClick={handleEditarClick}
              disabled={editando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border transition-colors ml-auto disabled:opacity-40"
              style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede0'; e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#333' }}
            >
              <Pencil size={12} />
              Editar times
            </button>
          )}

          {todosJogosFinalizados && (
            <div className="flex items-center gap-1 font-barlow-condensed text-xs text-muted-foreground ml-auto">
              <Lock size={12} />
              Times bloqueados
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

      {/* Partidas — placeholder */}
      <div>
        <h2 className="font-bebas text-2xl tracking-widest mb-3" style={{ color: '#f5c400' }}>PARTIDAS</h2>
        <div className="rounded-xl border p-8 text-center font-barlow-condensed text-sm text-muted-foreground" style={{ borderColor: '#242424', borderStyle: 'dashed' }}>
          Gestão de partidas em breve
        </div>
      </div>

      {/* Dialog de confirmação para editar times quando jogo iniciado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl text-destructive">
              Atenção
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="font-barlow-condensed text-sm text-foreground leading-relaxed">
              Um ou mais jogos foram iniciados. Editar os times irá{' '}
              <strong className="text-destructive">excluir todas as partidas em andamento</strong>.
            </p>
            <p className="font-barlow-condensed text-sm text-muted-foreground">
              Essa ação não pode ser desfeita. Deseja continuar?
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="destructive"
                onClick={confirmarEdicao}
                disabled={editando}
                className="font-barlow-condensed tracking-wide"
              >
                {editando ? 'Aguarde...' : 'Sim, editar times'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="font-barlow-condensed tracking-wide"
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
