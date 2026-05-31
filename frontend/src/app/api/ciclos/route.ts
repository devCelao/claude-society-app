import { NextResponse } from 'next/server'
import { CicloSchema, nomeDoCiclo } from '@/lib/validations/ciclo'

// TODO: substituir por prisma quando banco estiver acessível
const MOCK_CICLOS = [
  { id: 3, nome: 'Maio 2026', inicioEm: '2026-05-01', fimEm: null },
  { id: 2, nome: 'Abril 2026', inicioEm: '2026-04-01', fimEm: '2026-04-30' },
  { id: 1, nome: 'Março 2026', inicioEm: '2026-03-01', fimEm: '2026-03-31' },
]

export async function GET() {
  return NextResponse.json(MOCK_CICLOS)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = CicloSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { inicioEm, fimEm } = result.data
    const nome = nomeDoCiclo(inicioEm)

    // TODO: fechar ciclo ativo e persistir novo ciclo
    const novoCiclo = { id: Date.now(), nome, inicioEm, fimEm: fimEm ?? null }
    return NextResponse.json(novoCiclo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
