'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, Eye, EyeOff, Plus, MapPin } from 'lucide-react'
import { JogadorComPosicoes } from '@/types'
import { JogadorCard } from './JogadorCard'

interface Props {
  jogadoresIniciais: JogadorComPosicoes[]
}

export function JogadorListagem({ jogadoresIniciais }: Props) {
  const [mostrarSuspensos, setMostrarSuspensos] = useState(false)
  const [suspensos, setSuspensos] = useState<JogadorComPosicoes[]>([])
  const [carregandoSuspensos, setCarregandoSuspensos] = useState(false)
  const [busca, setBusca] = useState('')

  async function handleToggleSuspensos() {
    const novoValor = !mostrarSuspensos
    setMostrarSuspensos(novoValor)
    if (novoValor && suspensos.length === 0) {
      setCarregandoSuspensos(true)
      try {
        const res = await fetch('/api/jogadores?incluirSuspensos=true')
        const todos: JogadorComPosicoes[] = await res.json()
        setSuspensos(todos.filter((j) => j.deletedAt !== null))
      } finally {
        setCarregandoSuspensos(false)
      }
    }
  }

  function onReativar(id: number) {
    setSuspensos((prev) => prev.filter((j) => j.id !== id))
  }

  async function onSuspender() {
    if (!mostrarSuspensos) return
    const res = await fetch('/api/jogadores?incluirSuspensos=true')
    const todos: JogadorComPosicoes[] = await res.json()
    setSuspensos(todos.filter((j) => j.deletedAt !== null))
  }

  const q = busca.toLowerCase()
  const visiveis = jogadoresIniciais.filter(
    (j) => !q || j.nome.toLowerCase().includes(q) || j.apelido?.toLowerCase().includes(q)
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div
          className="w-8 h-[3px] rounded-sm mb-2"
          style={{ background: '#f5c400' }}
        />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          JOGADORES
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          <span style={{ color: '#f5c400', fontWeight: 600 }}>{jogadoresIniciais.length}</span>{' '}
          na pelada
        </p>
      </div>

      {/* Search + Novo */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar jogador ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl pl-11 pr-10 py-3 font-barlow text-sm text-foreground transition-all focus:outline-none focus:border-gold-dim focus:ring-2 focus:ring-gold/20"
            style={{ background: '#111111', border: '1px solid #242424' }}
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={17} />
            </button>
          )}
        </div>

        <Link
          href="/configuracao/posicoes"
          title="Cadastrar posições"
          className="flex items-center gap-1.5 px-4 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-colors hover:border-gold-dim flex-shrink-0"
          style={{ background: '#111111', border: '1px solid #242424', color: '#f5c400' }}
        >
          <MapPin size={16} />
          <span className="hidden md:inline">Posições</span>
        </Link>

        <Link
          href="/jogadores/novo"
          className="flex items-center gap-1.5 px-4 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ background: '#f5c400', color: '#000' }}
        >
          <Plus size={16} />
          <span className="hidden md:inline">Novo Jogador</span>
          <span className="md:hidden">Novo</span>
        </Link>
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {visiveis.length === 0 && (
          <div className="text-center py-14 text-muted-foreground">
            <div className="font-barlow-condensed text-sm tracking-wide">
              Nenhum jogador encontrado
            </div>
          </div>
        )}
        {visiveis.map((jogador, idx) => (
          <JogadorCard key={jogador.id} jogador={jogador} onSuspender={onSuspender} animDelay={idx * 45} />
        ))}
      </div>

      {/* Toggle suspensos */}
      <div className="text-center pt-2">
        <button
          onClick={handleToggleSuspensos}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-barlow-condensed text-sm tracking-wide text-muted-foreground hover:text-foreground transition-colors"
        >
          {mostrarSuspensos ? <EyeOff size={16} /> : <Eye size={16} />}
          {mostrarSuspensos
            ? 'Ocultar suspensos'
            : `Mostrar suspensos${suspensos.length > 0 ? ` (${suspensos.length})` : ''}`}
        </button>
      </div>

      {/* Lista de suspensos */}
      {mostrarSuspensos && (
        <div className="space-y-1.5">
          {carregandoSuspensos && (
            <div className="h-16 rounded-xl bg-muted animate-pulse" />
          )}
          {!carregandoSuspensos && suspensos.length === 0 && (
            <p className="text-muted-foreground font-barlow-condensed text-sm text-center py-6">
              Nenhum jogador suspenso.
            </p>
          )}
          {suspensos.map((jogador, idx) => (
            <JogadorCard
              key={jogador.id}
              jogador={jogador}
              suspenso
              onReativar={onReativar}
              animDelay={idx * 45}
            />
          ))}
        </div>
      )}
    </div>
  )
}
