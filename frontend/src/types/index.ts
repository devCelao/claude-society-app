// Re-exporta tipos gerados pelo Prisma.
// NUNCA importar de '@/generated/prisma/client' diretamente em outros arquivos —
// sempre importar daqui para manter controle centralizado dos tipos.
import type { Jogador, Posicao } from '@/generated/prisma/client'

export type {
  Jogador,
  Posicao,
  Ciclo,
  DiaDeJogo,
  Time,
  JogadorTime,
  Partida,
  Gol,
  Assistencia,
} from '@/generated/prisma/client'

// Resumo de posicao usado nas listagens/cards (sem timestamps).
export type PosicaoResumo = Pick<Posicao, 'id' | 'nome' | 'sigla' | 'cor'>

// Jogador com as posicoes ja resolvidas (relacao incluida na query).
export type JogadorComPosicoes = Jogador & {
  posicaoPrimaria: PosicaoResumo | null
  posicaoSecundaria: PosicaoResumo | null
}

