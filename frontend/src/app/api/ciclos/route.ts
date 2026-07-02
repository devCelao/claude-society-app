import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function serializeCiclo(c: {
  id: number
  nome: string
  inicioEm: Date
  fimEm: Date | null
}) {
  return {
    id: c.id,
    nome: c.nome,
    inicioEm: c.inicioEm.toISOString().split('T')[0],
    fimEm: c.fimEm ? c.fimEm.toISOString().split('T')[0] : null,
  }
}

export async function GET() {
  try {
    const ciclos = await prisma.ciclo.findMany({
      orderBy: { inicioEm: 'desc' },
      select: { id: true, nome: true, inicioEm: true, fimEm: true },
    })
    return NextResponse.json(ciclos.map(serializeCiclo))
  } catch (error) {
    console.error('[GET /api/ciclos]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
