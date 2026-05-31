import { NextResponse } from 'next/server'
import { DiaDeJogoSchema } from '@/lib/validations/dia-de-jogo'

export type DiaDeJogoResumo = {
  id: number
  data: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  totalJogadores: number
  cicloNome: string
}

// TODO: substituir por prisma
const MOCK_DIAS: DiaDeJogoResumo[] = [
  { id: 3, data: '2026-05-31', status: 'PENDENTE',    passo: 'lista',     totalJogadores: 0,  cicloNome: 'Maio 2026' },
  { id: 2, data: '2026-05-17', status: 'FINALIZADO',  passo: 'principal', totalJogadores: 18, cicloNome: 'Maio 2026' },
  { id: 1, data: '2026-05-03', status: 'FINALIZADO',  passo: 'principal', totalJogadores: 16, cicloNome: 'Maio 2026' },
]

export async function GET() {
  return NextResponse.json(MOCK_DIAS)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = DiaDeJogoSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }
    // TODO: criar no banco e associar ao ciclo ativo
    const novo = { id: Date.now(), data: result.data.data, status: 'PENDENTE', passo: 'lista', totalJogadores: 0, cicloNome: 'Maio 2026' }
    return NextResponse.json(novo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
