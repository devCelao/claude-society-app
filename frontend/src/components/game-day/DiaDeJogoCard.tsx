'use client'

import Link from 'next/link'
import { CalendarDays, Users, ChevronRight, Clock, CheckCircle2, Play } from 'lucide-react'

type DiaResumo = {
  id: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  totalJogadores: number
  cicloNome: string | null
}

const PASSO_LABEL: Record<string, string> = {
  lista:     'Montando lista',
  times:     'Montando times',
  principal: 'Times formados',
}

const STATUS_COLOR = {
  PENDENTE:     '#888888',
  EM_ANDAMENTO: '#f5c400',
  FINALIZADO:   '#4ade80',
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DiaDeJogoCard({ dia, animDelay = 0 }: { dia: DiaResumo; animDelay?: number }) {
  const color = STATUS_COLOR[dia.status]

  return (
    <Link
      href={`/dias-de-jogo/${dia.id}`}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all group animate-fade-up"
      style={{
        background: '#111111',
        borderColor: '#242424',
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#333'
        e.currentTarget.style.background = '#141414'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#242424'
        e.currentTarget.style.background = '#111111'
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(245,196,0,0.08)' }}
      >
        <CalendarDays size={17} style={{ color: '#f5c400' }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Linha superior: data (esquerda) + status/finalizado (direita) */}
        <div className="flex items-center justify-between gap-2">
          <div className="font-barlow-condensed text-sm font-semibold text-foreground tracking-wide capitalize truncate">
            {dia.data ? formatData(dia.data) : 'Aguardando início'}
          </div>

          {dia.status === 'FINALIZADO' && (
            <div className="flex items-center gap-1 font-barlow-condensed text-xs tracking-wide flex-shrink-0" style={{ color: '#4ade80' }}>
              <CheckCircle2 size={11} />
              <span>Finalizado</span>
            </div>
          )}

          {dia.status === 'EM_ANDAMENTO' && (
            <div className="flex items-center gap-1 font-barlow-condensed text-xs tracking-wide flex-shrink-0" style={{ color: '#f5c400' }}>
              <Play size={11} />
              <span>Em andamento</span>
            </div>
          )}

          {dia.status === 'PENDENTE' && (
            <div className="flex items-center gap-1 font-barlow-condensed text-xs tracking-wide flex-shrink-0" style={{ color: '#888' }}>
              <Clock size={11} />
              <span>{PASSO_LABEL[dia.passo]}</span>
            </div>
          )}
        </div>

        {/* Linha inferior: jogadores + ciclo */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-3">
            {dia.totalJogadores > 0 && (
              <div className="flex items-center gap-1 font-barlow-condensed text-xs text-muted-foreground">
                <Users size={11} />
                <span>{dia.totalJogadores} jogadores</span>
              </div>
            )}
          </div>

          {dia.cicloNome && (
            <div className="font-barlow-condensed text-[10px] tracking-widest text-muted-foreground">
              {dia.cicloNome}
            </div>
          )}
        </div>
      </div>

      <ChevronRight size={15} className="text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
