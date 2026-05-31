'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DiaDeJogoCard } from './DiaDeJogoCard'

type DiaResumo = {
  id: number
  data: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  totalJogadores: number
  cicloNome: string
}

export function DiasDeJogoListagem({ diasIniciais }: { diasIniciais: DiaResumo[] }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [novaData, setNovaData] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  async function handleCriar() {
    if (!novaData) return
    setCriando(true)
    try {
      const res = await fetch('/api/dias-de-jogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: novaData, cicloId: 3 }),
      })
      if (!res.ok) { toast.error('Erro ao criar dia de jogo'); return }
      const novo = await res.json()
      toast.success('Dia de jogo criado')
      router.push(`/dias-de-jogo/${novo.id}`)
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          DIAS DE JOGO
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          <span style={{ color: '#f5c400', fontWeight: 600 }}>{diasIniciais.length}</span> dias registrados
        </p>
      </div>

      {/* Novo dia */}
      {mostrarForm ? (
        <div
          className="flex items-center gap-2 p-3 rounded-xl border"
          style={{ background: '#111111', borderColor: '#333' }}
        >
          <input
            type="date"
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
            className="flex-1 bg-transparent font-barlow-condensed text-sm text-foreground focus:outline-none"
          />
          <button
            onClick={handleCriar}
            disabled={!novaData || criando}
            className="px-4 py-1.5 rounded-lg font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-40 transition-opacity"
            style={{ background: '#f5c400', color: '#000' }}
          >
            {criando ? 'Criando...' : 'Criar'}
          </button>
          <button
            onClick={() => { setMostrarForm(false); setNovaData('') }}
            className="px-3 py-1.5 rounded-lg font-barlow-condensed text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-opacity hover:opacity-90 w-full justify-center"
          style={{ background: '#f5c400', color: '#000' }}
        >
          <Plus size={16} />
          Novo Dia de Jogo
        </button>
      )}

      {/* Lista */}
      <div className="space-y-1.5">
        {diasIniciais.map((dia, idx) => (
          <DiaDeJogoCard key={dia.id} dia={dia} animDelay={idx * 45} />
        ))}
      </div>
    </div>
  )
}
