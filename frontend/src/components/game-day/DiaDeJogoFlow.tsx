'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ListaDoDia } from './ListaDoDia'
import { MontarTimes } from './MontarTimes'
import { DiaDeJogoMain } from './DiaDeJogoMain'

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

export type Jogador = {
  id: number
  nome: string
  apelido: string | null
  convidado: boolean
}

export type TimeFormado = {
  id?: number
  nome: string
  cor: CorTime
  jogadores: Jogador[]
}

export type Partida = {
  id: number
  timeAId: number
  timeBId: number
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'FINALIZADA'
}

type Passo = 'lista' | 'times' | 'principal'

interface Props {
  diaId: number
  data: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passoinicial: Passo
  jogadoresSelecionadosInicial: Jogador[]
  timesIniciais: TimeFormado[]
  todosJogadores: Jogador[]
  partidasIniciais: Partida[]
}

export function DiaDeJogoFlow({
  diaId,
  data,
  status: statusInicial,
  passoinicial,
  jogadoresSelecionadosInicial,
  timesIniciais,
  todosJogadores,
  partidasIniciais,
}: Props) {
  const [passo, setPasso] = useState<Passo>(passoinicial)
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState<Jogador[]>(jogadoresSelecionadosInicial)
  const [times, setTimes] = useState<TimeFormado[]>(timesIniciais)
  const [status, setStatus] = useState(statusInicial)
  const [partidas] = useState<Partida[]>(partidasIniciais)

  async function handleFecharLista(jogadores: Jogador[]) {
    try {
      await fetch(`/api/dias-de-jogo/${diaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passo: 'times', jogadorIds: jogadores.map((j) => j.id) }),
      })
    } catch {
      // ignora erro de rede no mock — estado avança mesmo assim
    }
    setJogadoresSelecionados(jogadores)
    setPasso('times')
    toast.success(`Lista fechada com ${jogadores.length} jogadores`)
  }

  async function handleFecharTimes(timesFormados: TimeFormado[]) {
    try {
      await fetch(`/api/dias-de-jogo/${diaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passo: 'principal',
          status: 'EM_ANDAMENTO',
          times: timesFormados.map((t) => ({
            nome: t.nome,
            cor: t.cor,
            jogadorIds: t.jogadores.map((j) => j.id),
          })),
        }),
      })
    } catch {}
    setTimes(timesFormados)
    setStatus('EM_ANDAMENTO')
    setPasso('principal')
    toast.success('Times formados! Boa pelada!')
  }

  async function handleEditarTimes() {
    // Se havia partidas EM_ANDAMENTO, deleta (já validado pelo chamador com confirmação)
    const iniciadas = partidas.filter((p) => p.status === 'EM_ANDAMENTO' || p.status === 'FINALIZADA')
    if (iniciadas.length > 0) {
      try {
        await Promise.all(
          iniciadas.map((p) =>
            fetch(`/api/dias-de-jogo/${diaId}/partidas/${p.id}`, { method: 'DELETE' })
          )
        )
      } catch {}
    }
    setPasso('times')
  }

  if (passo === 'lista') {
    return (
      <ListaDoDia
        diaId={diaId}
        data={data}
        todosJogadores={todosJogadores}
        jogadoresSelecionados={jogadoresSelecionados}
        onFechar={handleFecharLista}
      />
    )
  }

  if (passo === 'times') {
    return (
      <MontarTimes
        diaId={diaId}
        data={data}
        jogadoresSelecionados={jogadoresSelecionados}
        timesIniciais={times}
        onFechar={handleFecharTimes}
        onVoltar={() => setPasso('lista')}
      />
    )
  }

  return (
    <DiaDeJogoMain
      diaId={diaId}
      data={data}
      times={times}
      status={status}
      partidas={partidas}
      onEditarTimes={handleEditarTimes}
    />
  )
}
