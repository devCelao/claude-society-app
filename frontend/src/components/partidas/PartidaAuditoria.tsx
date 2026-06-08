'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { X, Pencil, Plus, Check, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TimeFormado, Partida } from '@/components/game-day/DiaDeJogoFlow'

type GolAudit = {
  id: number
  timeId: number
  jogador: { id: number; nome: string }
  assistencia: { id: number; jogador: { id: number; nome: string } } | null
}

type PartidaAuditData = {
  id: number
  timeAId: number
  timeBId: number
  vencedorId: number | null
  timeA: { id: number; nome: string; cor: string }
  timeB: { id: number; nome: string; cor: string }
  gols: GolAudit[]
}

const COR_HEX: Record<string, string> = {
  vermelho: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  laranja: '#f97316',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  diaId: number
  partida: Partida
  times: TimeFormado[]
}

export function PartidaAuditoria({ diaId, partida, times }: Props) {
  const { data, mutate, isLoading } = useSWR<PartidaAuditData>(
    `/api/dias-de-jogo/${diaId}/partidas/${partida.id}`,
    fetcher
  )

  const [editAssistGolId, setEditAssistGolId] = useState<number | null>(null)
  const [assistValue, setAssistValue] = useState<string>('')
  const [adicionando, setAdicionando] = useState(false)
  const [novoTimeId, setNovoTimeId] = useState<string>('')
  const [novoJogadorId, setNovoJogadorId] = useState<string>('')
  const [novoAssistId, setNovoAssistId] = useState<string>('')
  const [carregando, setCarregando] = useState(false)

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin" style={{ color: '#555' }} />
      </div>
    )
  }

  const hexA = COR_HEX[data.timeA.cor] ?? '#888'
  const hexB = COR_HEX[data.timeB.cor] ?? '#888'
  const golsA = data.gols.filter((g) => g.timeId === data.timeAId).length
  const golsB = data.gols.filter((g) => g.timeId === data.timeBId).length
  const vencedorNome =
    data.vencedorId === data.timeAId
      ? data.timeA.nome
      : data.vencedorId === data.timeBId
        ? data.timeB.nome
        : null

  const timesPartida = [
    { id: data.timeAId, nome: data.timeA.nome, cor: hexA },
    { id: data.timeBId, nome: data.timeB.nome, cor: hexB },
  ]

  const jogadoresDoTime = (timeId: number) =>
    times.find((t) => t.id === timeId)?.jogadores ?? []

  const todosJogadores = [
    ...jogadoresDoTime(data.timeAId),
    ...jogadoresDoTime(data.timeBId),
  ]

  async function handleDeleteGol(golId: number) {
    setCarregando(true)
    try {
      const res = await fetch(
        `/api/dias-de-jogo/${diaId}/partidas/${partida.id}/gols/${golId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const b = await res.json()
        toast.error(b.error ?? 'Erro ao remover gol')
        return
      }
      await mutate()
      toast.success('Gol removido')
    } finally {
      setCarregando(false)
    }
  }

  async function handleSalvarAssist(golId: number) {
    setCarregando(true)
    try {
      const assistId = assistValue === '' || assistValue === 'none' ? null : parseInt(assistValue, 10)
      const res = await fetch(
        `/api/dias-de-jogo/${diaId}/partidas/${partida.id}/gols/${golId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assistenciaJogadorId: assistId }),
        }
      )
      if (!res.ok) {
        const b = await res.json()
        toast.error(b.error ?? 'Erro ao salvar assistencia')
        return
      }
      setEditAssistGolId(null)
      await mutate()
      toast.success('Assistencia atualizada')
    } finally {
      setCarregando(false)
    }
  }

  async function handleAdicionarGol() {
    if (!novoTimeId || !novoJogadorId) {
      toast.error('Selecione time e jogador')
      return
    }
    setCarregando(true)
    try {
      const assistId =
        novoAssistId === '' || novoAssistId === 'none'
          ? null
          : parseInt(novoAssistId, 10)
      const res = await fetch(
        `/api/dias-de-jogo/${diaId}/partidas/${partida.id}/gols`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeId: parseInt(novoTimeId, 10),
            jogadorId: parseInt(novoJogadorId, 10),
            assistenciaJogadorId: assistId,
          }),
        }
      )
      if (!res.ok) {
        const b = await res.json()
        toast.error(b.error ?? 'Erro ao adicionar gol')
        return
      }
      setAdicionando(false)
      setNovoTimeId('')
      setNovoJogadorId('')
      setNovoAssistId('')
      await mutate()
      toast.success('Gol adicionado')
    } finally {
      setCarregando(false)
    }
  }

  const jogadoresNovoTime = novoTimeId ? jogadoresDoTime(parseInt(novoTimeId, 10)) : []
  const jogadoresSemNovoGolador = novoJogadorId
    ? jogadoresNovoTime.filter((j) => j.id !== parseInt(novoJogadorId, 10))
    : jogadoresNovoTime

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
    >
      {/* Header da partida */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#161616', borderBottom: '1px solid #1e1e1e' }}>
        <span className="font-bebas tracking-widest text-base" style={{ color: hexA }}>{data.timeA.nome}</span>
        <span className="font-bebas text-xl tabular-nums tracking-widest">{golsA}×{golsB}</span>
        <span className="font-bebas tracking-widest text-base" style={{ color: hexB }}>{data.timeB.nome}</span>
        <span className="ml-auto font-barlow-condensed text-xs" style={{ color: vencedorNome ? '#4ade80' : '#555' }}>
          {vencedorNome ? `✓ ${vencedorNome}` : 'empate'}
        </span>
      </div>

      {/* Lista de gols */}
      <div className="divide-y" style={{ borderColor: '#1a1a1a' }}>
        {data.gols.length === 0 && (
          <div className="px-4 py-4 font-barlow-condensed text-xs text-muted-foreground text-center">
            Nenhum gol registrado
          </div>
        )}
        {data.gols.map((gol) => {
          const corTime = gol.timeId === data.timeAId ? hexA : hexB
          const isEditandoAssist = editAssistGolId === gol.id

          return (
            <div key={gol.id} className="px-4 py-2.5 space-y-1.5">
              {/* Linha principal do gol */}
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: corTime }} />
                <span className="flex-1 font-barlow-condensed text-sm text-foreground truncate">
                  {gol.jogador.nome}
                </span>
                {/* Botão editar assistência */}
                <button
                  onClick={() => {
                    setEditAssistGolId(isEditandoAssist ? null : gol.id)
                    setAssistValue(gol.assistencia ? String(gol.assistencia.jogador.id) : '')
                  }}
                  disabled={carregando}
                  title="Editar assistência"
                  className="p-1 rounded transition-colors flex-shrink-0"
                  style={{ color: gol.assistencia ? '#3b82f6' : '#444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = gol.assistencia ? '#3b82f6' : '#444')}
                >
                  <Pencil size={12} />
                </button>
                {/* Botão deletar */}
                <button
                  onClick={() => handleDeleteGol(gol.id)}
                  disabled={carregando}
                  title="Remover gol"
                  className="p-1 rounded transition-colors flex-shrink-0"
                  style={{ color: '#444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Linha de assistência (se houver) */}
              {gol.assistencia && !isEditandoAssist && (
                <div className="pl-[18px] font-barlow-condensed text-xs" style={{ color: '#3b82f6' }}>
                  🎯 {gol.assistencia.jogador.nome}
                </div>
              )}

              {/* Editor de assistência inline */}
              {isEditandoAssist && (
                <div className="pl-[18px] flex items-center gap-2">
                  <Select value={assistValue} onValueChange={(v) => setAssistValue(v ?? '')}>
                    <SelectTrigger className="h-7 text-xs flex-1 min-w-0" style={{ fontSize: '12px' }}>
                      <SelectValue placeholder="Sem assistência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem assistência</SelectItem>
                      {jogadoresDoTime(gol.timeId)
                        .filter((j) => j.id !== gol.jogador.id)
                        .map((j) => (
                          <SelectItem key={j.id} value={String(j.id)}>
                            {j.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => handleSalvarAssist(gol.id)}
                    disabled={carregando}
                    className="p-1.5 rounded flex-shrink-0 transition-colors"
                    style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                    title="Confirmar"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setEditAssistGolId(null)}
                    className="p-1.5 rounded flex-shrink-0 transition-colors"
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

      {/* Formulário inline de adicionar gol */}
      {adicionando && (
        <div
          className="px-4 py-3 space-y-2.5"
          style={{ borderTop: '1px solid #1e1e1e', background: '#0e0e0e' }}
        >
          <p className="font-barlow-condensed text-[11px] tracking-widest uppercase" style={{ color: '#f5c400' }}>
            Adicionar Gol
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Time</p>
              <Select value={novoTimeId} onValueChange={(v) => { setNovoTimeId(v ?? ''); setNovoJogadorId('') }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {timesPartida.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span style={{ color: t.cor }}>{t.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Jogador</p>
              <Select value={novoJogadorId} onValueChange={(v) => setNovoJogadorId(v ?? '')} disabled={!novoTimeId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {jogadoresNovoTime.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Assistência (opcional)</p>
            <Select value={novoAssistId} onValueChange={(v) => setNovoAssistId(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sem assistência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem assistência</SelectItem>
                {jogadoresSemNovoGolador.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdicionarGol}
              disabled={carregando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-barlow-condensed text-xs font-bold tracking-wide disabled:opacity-40"
              style={{ background: '#f5c400', color: '#000' }}
            >
              <Check size={13} />
              Confirmar
            </button>
            <button
              onClick={() => { setAdicionando(false); setNovoTimeId(''); setNovoJogadorId(''); setNovoAssistId('') }}
              className="px-3 py-1.5 rounded-lg font-barlow-condensed text-xs tracking-wide border"
              style={{ borderColor: '#333', color: '#888' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Footer — botão adicionar gol */}
      {!adicionando && (
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={() => setAdicionando(true)}
            disabled={carregando}
            className="flex items-center gap-1.5 font-barlow-condensed text-xs tracking-wide transition-colors"
            style={{ color: '#555' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f5c400')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
          >
            <Plus size={13} />
            Adicionar Gol
          </button>
        </div>
      )}
    </div>
  )
}
