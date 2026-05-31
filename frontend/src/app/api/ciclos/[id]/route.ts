import { NextResponse } from 'next/server'
import { CicloUpdateSchema, nomeDoCiclo } from '@/lib/validations/ciclo'

export type StatJogador = {
  posicao: number
  nome: string
  valor: number
  vitorias: number
  pontos: number
}

export type CicloStats = {
  ciclo: { id: number; nome: string; inicioEm: string; fimEm: string | null }
  artilharia: StatJogador[]
  passes: StatJogador[]
  fotos: StatJogador[]
}

// TODO: substituir por prisma quando banco estiver acessível
const MOCK_STATS: Record<number, CicloStats> = {
  3: {
    ciclo: { id: 3, nome: 'Maio 2026', inicioEm: '2026-05-01', fimEm: null },
    artilharia: [
      { posicao: 1, nome: 'Jonathan', valor: 6, vitorias: 9, pontos: 27 },
      { posicao: 2, nome: 'João Pedro', valor: 5, vitorias: 9, pontos: 27 },
      { posicao: 3, nome: 'Guilherme Bragança', valor: 5, vitorias: 5, pontos: 15 },
      { posicao: 4, nome: 'Maicon', valor: 4, vitorias: 9, pontos: 27 },
      { posicao: 5, nome: 'João Victor', valor: 4, vitorias: 5, pontos: 15 },
      { posicao: 6, nome: 'Bernardo', valor: 3, vitorias: 6, pontos: 18 },
      { posicao: 7, nome: 'Ricardo', valor: 3, vitorias: 4, pontos: 12 },
    ],
    passes: [
      { posicao: 1, nome: 'Jonathan', valor: 5, vitorias: 9, pontos: 27 },
      { posicao: 2, nome: 'Deyvison', valor: 5, vitorias: 9, pontos: 27 },
      { posicao: 3, nome: 'João Pedro', valor: 3, vitorias: 9, pontos: 27 },
      { posicao: 4, nome: 'Pedro Braz', valor: 3, vitorias: 5, pontos: 15 },
      { posicao: 5, nome: 'Matheus Raposo', valor: 2, vitorias: 10, pontos: 30 },
      { posicao: 6, nome: 'Bernardo', valor: 2, vitorias: 6, pontos: 18 },
      { posicao: 7, nome: 'Arthur', valor: 2, vitorias: 6, pontos: 18 },
    ],
    fotos: [
      { posicao: 1, nome: 'Matheus Raposo', valor: 10, vitorias: 10, pontos: 30 },
      { posicao: 2, nome: 'Jonathan', valor: 9, vitorias: 9, pontos: 27 },
      { posicao: 3, nome: 'Maicon', valor: 9, vitorias: 9, pontos: 27 },
      { posicao: 4, nome: 'João Pedro', valor: 9, vitorias: 9, pontos: 27 },
      { posicao: 5, nome: 'Deyvison', valor: 9, vitorias: 9, pontos: 27 },
      { posicao: 6, nome: 'Bernardo', valor: 6, vitorias: 6, pontos: 18 },
      { posicao: 7, nome: 'Marcelo', valor: 6, vitorias: 6, pontos: 18 },
    ],
  },
  2: {
    ciclo: { id: 2, nome: 'Abril 2026', inicioEm: '2026-04-01', fimEm: '2026-04-30' },
    artilharia: [
      { posicao: 1, nome: 'Marcelo', valor: 8, vitorias: 7, pontos: 21 },
      { posicao: 2, nome: 'Arthur', valor: 6, vitorias: 8, pontos: 24 },
    ],
    passes: [
      { posicao: 1, nome: 'Lucas Fonseca', valor: 4, vitorias: 7, pontos: 21 },
    ],
    fotos: [
      { posicao: 1, nome: 'Arthur', valor: 8, vitorias: 8, pontos: 24 },
      { posicao: 2, nome: 'Marcelo', valor: 7, vitorias: 7, pontos: 21 },
    ],
  },
  1: {
    ciclo: { id: 1, nome: 'Março 2026', inicioEm: '2026-03-01', fimEm: '2026-03-31' },
    artilharia: [
      { posicao: 1, nome: 'Pedro Pires', valor: 7, vitorias: 6, pontos: 18 },
    ],
    passes: [
      { posicao: 1, nome: 'Garrido', valor: 5, vitorias: 5, pontos: 15 },
    ],
    fotos: [
      { posicao: 1, nome: 'Pedro Pires', valor: 6, vitorias: 6, pontos: 18 },
    ],
  },
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cicloId = parseInt(id, 10)

  const stats = MOCK_STATS[cicloId]
  if (!stats) {
    return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })
  }
  return NextResponse.json(stats)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)
    const body = await request.json()
    const result = CicloUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { inicioEm, fimEm } = result.data
    const nome = inicioEm ? nomeDoCiclo(inicioEm) : undefined

    // TODO: persistir via prisma
    return NextResponse.json({ id: cicloId, nome, inicioEm, fimEm: fimEm ?? null })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
