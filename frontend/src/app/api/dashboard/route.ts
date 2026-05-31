import { NextResponse } from 'next/server'

export type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

export type JogadorResumo = { id: number; nome: string }

export type TimeResumo = {
  id: number
  nome: string
  cor: CorTime
  totalJogadores: number
  jogadores: JogadorResumo[]
}

export type PartidaAtiva = {
  id: number
  timeA: TimeResumo
  timeB: TimeResumo
  golsA: number
  golsB: number
  inicioEm: string | null
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'FINALIZADA'
}

export type DiaAtivo = {
  id: number
  data: string
  times: TimeResumo[]
  partidaAtiva: PartidaAtiva | null
}

export type StatDestaque = { nome: string; valor: number }

export type DashboardData = {
  diaAtivo: DiaAtivo | null
  stats: {
    artilheiro: StatDestaque | null
    liderPasse: StatDestaque | null
    liderFoto: StatDestaque | null
    cicloNome: string
  }
}

// TODO: substituir por prisma
const MOCK: DashboardData = {
  diaAtivo: {
    id: 3,
    data: '2026-05-31',
    times: [
      {
        id: 1, nome: 'Time A', cor: 'vermelho', totalJogadores: 6,
        jogadores: [
          { id: 1, nome: 'Jonathan' }, { id: 2, nome: 'João Pedro' },
          { id: 3, nome: 'Guilherme' }, { id: 4, nome: 'Maicon' },
          { id: 5, nome: 'João Victor' }, { id: 6, nome: 'Bernardo' },
        ],
      },
      {
        id: 2, nome: 'Time B', cor: 'azul', totalJogadores: 6,
        jogadores: [
          { id: 7, nome: 'Ricardo' }, { id: 8, nome: 'Vitinho' },
          { id: 9, nome: 'Marcelo' }, { id: 10, nome: 'Arthur' },
          { id: 11, nome: 'Pedro Pires' }, { id: 12, nome: 'Theo' },
        ],
      },
      {
        id: 3, nome: 'Time C', cor: 'verde', totalJogadores: 6,
        jogadores: [
          { id: 13, nome: 'Gustavo Borcard' }, { id: 14, nome: 'Matheus Raposo' },
          { id: 15, nome: 'Deyvison' }, { id: 16, nome: 'Lucas Fonseca' },
          { id: 17, nome: 'Pedro Braz' }, { id: 18, nome: 'Miguel' },
        ],
      },
    ],
    partidaAtiva: null,
    // Para simular uma partida em andamento, use:
    // partidaAtiva: {
    //   id: 1,
    //   timeA: { id: 1, nome: 'Time A', cor: 'vermelho', totalJogadores: 6 },
    //   timeB: { id: 2, nome: 'Time B', cor: 'azul', totalJogadores: 6 },
    //   golsA: 1, golsB: 0,
    //   inicioEm: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 min atrás
    //   status: 'EM_ANDAMENTO',
    // },
  },
  stats: {
    artilheiro:  { nome: 'Jonathan',       valor: 6  },
    liderPasse:  { nome: 'Jonathan',       valor: 5  },
    liderFoto:   { nome: 'Matheus Raposo', valor: 10 },
    cicloNome: 'Maio 2026',
  },
}

export async function GET() {
  return NextResponse.json(MOCK)
}
