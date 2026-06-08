import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcularPeriodoCiclo } from '@/lib/utils'
import { CicloSchema, nomeDoCiclo } from '@/lib/validations/ciclo'

function serializeCiclo(c: {
  id: number
  nome: string
  diaDeCorte: number | null
  inicioEm: Date
  fimEm: Date | null
}) {
  return {
    id: c.id,
    nome: c.nome,
    diaDeCorte: c.diaDeCorte,
    inicioEm: c.inicioEm.toISOString().split('T')[0],
    fimEm: c.fimEm ? c.fimEm.toISOString().split('T')[0] : null,
  }
}

export async function GET() {
  try {
    const ciclos = await prisma.ciclo.findMany({
      orderBy: { inicioEm: 'desc' },
      select: { id: true, nome: true, diaDeCorte: true, inicioEm: true, fimEm: true },
    })
    return NextResponse.json(ciclos.map(serializeCiclo))
  } catch (error) {
    console.error('[GET /api/ciclos]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = CicloSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { diaDeCorte, mesReferencia } = result.data
    const [ano, mes] = mesReferencia.split('-').map(Number)
    const { inicioEm, fimEm } = calcularPeriodoCiclo(diaDeCorte, mes, ano)
    const nome = nomeDoCiclo(inicioEm)

    const ciclo = await prisma.ciclo.create({
      data: { nome, diaDeCorte, inicioEm, fimEm },
    })

    return NextResponse.json(serializeCiclo(ciclo), { status: 201 })
  } catch (error) {
    console.error('[POST /api/ciclos]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
