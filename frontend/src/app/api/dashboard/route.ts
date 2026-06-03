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