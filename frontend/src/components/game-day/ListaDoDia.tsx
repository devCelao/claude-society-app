'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Users } from 'lucide-react'
import type { Jogador } from './DiaDeJogoFlow'

interface Props {
  diaId: number
  data: string
  todosJogadores: Jogador[]
  jogadoresSelecionados: Jogador[]
  onFechar: (jogadores: Jogador[]) => Promise<void>
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ListaDoDia({ todosJogadores, jogadoresSelecionados, data, onFechar }: Props) {
  const [selecionados, setSelecionados] = useState<Set<number>>(
    new Set(jogadoresSelecionados.map((j) => j.id))
  )
  const [salvando, setSalvando] = useState(false)

  function toggle(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 18) {
          toast.error('Máximo de 18 jogadores atingido')
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  async function fecharLista() {
    if (selecionados.size === 0) { toast.error('Selecione ao menos 1 jogador'); return }
    setSalvando(true)
    try {
      const jogadores = todosJogadores.filter((j) => selecionados.has(j.id))
      await onFechar(jogadores)
    } finally {
      setSalvando(false)
    }
  }

  const count = selecionados.size

  return (
    <div className="space-y-5">
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
            Passo 1 de 3
          </div>
          <span className="font-barlow-condensed text-sm text-muted-foreground">Montando lista do dia</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-barlow-condensed text-sm flex-shrink-0">
          <Users size={14} className="text-muted-foreground" />
          <span className="text-foreground font-semibold tabular-nums">{count}</span>
          <span className="text-muted-foreground">/ 18</span>
        </div>
        <button
          onClick={fecharLista}
          disabled={count === 0 || salvando}
          className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-30"
          style={{ background: '#f5c400', color: '#000' }}
        >
          {salvando ? 'Fechando...' : 'Fechar Lista'}
        </button>
      </div>

      <div className="space-y-1.5">
        {todosJogadores.map((jogador, idx) => {
          const ativo = selecionados.has(jogador.id)
          return (
            <button
              key={jogador.id}
              onClick={() => toggle(jogador.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all animate-fade-up"
              style={{
                background: ativo ? 'rgba(245,196,0,0.08)' : '#111111',
                borderColor: ativo ? 'rgba(245,196,0,0.3)' : '#242424',
                animationDelay: `${idx * 30}ms`,
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: ativo ? '#f5c400' : 'transparent',
                  border: ativo ? '2px solid #f5c400' : '2px solid #333',
                }}
              >
                {ativo && <Check size={12} strokeWidth={3} style={{ color: '#000' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="font-barlow-condensed text-sm font-semibold tracking-wide"
                  style={{ color: ativo ? '#f5c400' : '#f0ede0' }}
                >
                  {jogador.nome}
                </span>
                {jogador.apelido && (
                  <span className="font-barlow-condensed text-xs text-muted-foreground ml-2">
                    ({jogador.apelido})
                  </span>
                )}
              </div>
              {jogador.convidado && (
                <span
                  className="font-barlow-condensed text-[10px] tracking-widest px-2 py-0.5 rounded"
                  style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}
                >
                  CONVIDADO
                </span>
              )}
            </button>
          )
        })}
      </div>

      {count > 0 && (
        <button
          onClick={fecharLista}
          disabled={salvando}
          className="w-full py-3 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-all disabled:opacity-30"
          style={{ background: '#f5c400', color: '#000' }}
        >
          {salvando ? 'Fechando...' : `Fechar Lista — ${count} jogadores`}
        </button>
      )}
    </div>
  )
}
