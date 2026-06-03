'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { DiaDeJogoCard } from './DiaDeJogoCard'
import Link from 'next/link'

type DiaResumo = {
  id: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  totalJogadores: number
  cicloNome: string | null
}

const PASSO_LABEL: Record<string, string> = {
  lista:     'Montando lista de jogadores',
  times:     'Montando times',
  principal: 'Times formados — aguardando início',
}

export function DiasDeJogoListagem({ diasIniciais }: { diasIniciais: DiaResumo[] }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)

  const pendente = diasIniciais.find((d) => d.status === 'PENDENTE')
  const ativo = diasIniciais.find((d) => d.status === 'EM_ANDAMENTO')
  const historico = diasIniciais.filter((d) => d.status === 'FINALIZADO')

  async function handleCriar() {
    setCriando(true)
    try {
      const res = await fetch('/api/dias-de-jogo', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? 'Erro ao criar esquema de jogo')
        return
      }
      toast.success('Esquema de jogo criado')
      router.refresh()
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          CONFRONTOS
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          <span style={{ color: '#f5c400', fontWeight: 600 }}>{historico.length}</span> jogos finalizados
        </p>
      </div>

      {/* Esquema pendente */}
      {pendente && (
        <div>
          <p className="font-barlow-condensed text-xs tracking-widest text-muted-foreground uppercase mb-2">
            Confronto em preparação
          </p>
          <Link
            href={`/dias-de-jogo/${pendente.id}`}
            className="flex items-center gap-4 px-4 py-4 rounded-xl border transition-all group"
            style={{ background: '#111111', borderColor: 'rgba(245,196,0,0.3)', boxShadow: 'inset 3px 0 0 #f5c400' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,196,0,0.1)' }}
            >
              <Clock size={18} style={{ color: '#f5c400' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-barlow-condensed text-sm font-semibold tracking-wide" style={{ color: '#f5c400' }}>
                Aguardando início
              </div>
              <div className="font-barlow-condensed text-xs text-muted-foreground mt-0.5">
                {PASSO_LABEL[pendente.passo]}
                {pendente.totalJogadores > 0 && ` · ${pendente.totalJogadores} jogadores`}
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {/* Confronto em andamento */}
      {ativo && (
        <div>
          <p className="font-barlow-condensed text-xs tracking-widest text-muted-foreground uppercase mb-2">
            Em andamento
          </p>
          <DiaDeJogoCard dia={ativo} />
        </div>
      )}

      {/* Botão novo esquema */}
      <div>
        {pendente || ativo ? (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-barlow-condensed text-sm text-muted-foreground"
            style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}
          >
            <Plus size={15} className="opacity-40" />
            <span>
              {pendente
                ? 'Inicie o esquema atual antes de criar um novo'
                : 'Finalize o confronto em andamento antes de criar um novo esquema'}
            </span>
          </div>
        ) : (
          <button
            onClick={handleCriar}
            disabled={criando}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-opacity hover:opacity-90 w-full justify-center disabled:opacity-50"
            style={{ background: '#f5c400', color: '#000' }}
          >
            <Plus size={16} />
            {criando ? 'Criando...' : 'Novo confronto'}
          </button>
        )}
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-barlow-condensed text-xs tracking-widest text-muted-foreground uppercase mb-2">
            Histórico
          </p>
          {historico.map((dia, idx) => (
            <DiaDeJogoCard key={dia.id} dia={dia} animDelay={idx * 45} />
          ))}
        </div>
      )}

      {historico.length === 0 && !pendente && !ativo && (
        <p className="text-center py-10 font-barlow-condensed text-sm text-muted-foreground">
          Nenhum jogo realizado ainda.
        </p>
      )}
    </div>
  )
}
