'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListaDoDia } from './ListaDoDia'
import { MontarTimes } from './MontarTimes'
import { DiaDeJogoMain } from './DiaDeJogoMain'

type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

export type PosicaoSigla = { sigla: string } | null

export type Jogador = {
  id: number
  nome: string
  apelido: string | null
  convidado: boolean
  posicaoPrimaria: PosicaoSigla
  posicaoSecundaria: PosicaoSigla
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
  timeANome: string
  timeACor: string
  timeBNome: string
  timeBCor: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'FINALIZADA'
  vencedorId: number | null
  golsA: number
  golsB: number
}

export type StatsJogadores = Record<number, { gols: number; assists: number }>

type Passo = 'lista' | 'times' | 'principal'

interface Props {
  diaId: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passoinicial: Passo
  jogadoresSelecionadosInicial: Jogador[]
  timesIniciais: TimeFormado[]
  todosJogadores: Jogador[]
  partidasIniciais: Partida[]
  statsJogadores: StatsJogadores
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
  statsJogadores,
}: Props) {
  const router = useRouter()
  const [passo, setPasso] = useState<Passo>(passoinicial)
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState<Jogador[]>(jogadoresSelecionadosInicial)
  const [times, setTimes] = useState<TimeFormado[]>(timesIniciais)
  const [status, setStatus] = useState(statusInicial)
  const [partidas] = useState<Partida[]>(partidasIniciais)

  async function handleFecharLista(jogadores: Jogador[]) {
    const res = await fetch(`/api/dias-de-jogo/${diaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passo: 'times', jogadorIds: jogadores.map((j) => j.id) }),
    })
    if (!res.ok) {
      toast.error('Erro ao salvar lista de jogadores')
      return
    }
    setJogadoresSelecionados(jogadores)
    setPasso('times')
    router.refresh()
    toast.success(`Lista fechada com ${jogadores.length} jogadores`)
  }

  async function handleVoltarDeTimes() {
    const res = await fetch(`/api/dias-de-jogo/${diaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passo: 'lista' }),
    })
    if (!res.ok) {
      toast.error('Erro ao voltar para a lista')
      return
    }
    setTimes([])
    setPasso('lista')
    router.refresh()
  }

  async function handleFecharTimes(timesFormados: TimeFormado[]) {
    const res = await fetch(`/api/dias-de-jogo/${diaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passo: 'principal',
        times: timesFormados.map((t) => ({
          nome: t.nome,
          cor: t.cor,
          jogadorIds: t.jogadores.map((j) => j.id),
        })),
      }),
    })
    if (!res.ok) {
      toast.error('Erro ao salvar times')
      return
    }
    setTimes(timesFormados)
    setPasso('principal')
    router.refresh()
    toast.success('Times formados! Boa pelada!')
  }

  function handleIniciado() {
    setStatus('EM_ANDAMENTO')
    router.refresh()
    router.push('/dashboard')
  }

  async function handleEditarTimes() {
    const res = await fetch(`/api/dias-de-jogo/${diaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passo: 'editar' }),
    })
    if (!res.ok) {
      toast.error('Erro ao voltar para edição de times')
      return
    }
    if (status === 'EM_ANDAMENTO') setStatus('PENDENTE')
    setPasso('times')
    // Invalida cache do router para que /dashboard reflita o novo status
    router.refresh()
  }

  if (passo === 'lista') {
    return (
      <ListaDoDia
        diaId={diaId}
        data={data ?? ''}
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
        data={data ?? ''}
        jogadoresSelecionados={jogadoresSelecionados}
        timesIniciais={times}
        onFechar={handleFecharTimes}
        onVoltar={handleVoltarDeTimes}
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
      statsJogadores={statsJogadores}
      onEditarTimes={handleEditarTimes}
      onIniciado={handleIniciado}
    />
  )
}
