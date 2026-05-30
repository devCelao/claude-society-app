// Re-exporta tipos gerados pelo Prisma.
// NUNCA importar de '@/generated/prisma/client' diretamente em outros arquivos —
// sempre importar daqui para manter controle centralizado dos tipos.
export type {
  Jogador,
  Ciclo,
  DiaDeJogo,
  Time,
  JogadorTime,
  Partida,
  Gol,
  Assistencia,
} from '@/generated/prisma/client'
