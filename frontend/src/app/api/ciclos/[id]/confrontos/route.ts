import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export type ConfrontoDoCiclo = {
  id: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  partidas: number
}

// Confrontos (dias de jogo) vinculados ao ciclo — usado no "Ajustar ciclos"
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)

    const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId }, select: { id: true } })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })

    const dias = await prisma.diaDeJogo.findMany({
      where: { cicloId },
      orderBy: [{ data: 'asc' }, { id: 'asc' }],
      select: { id: true, data: true, status: true, _count: { select: { partidas: true } } },
    })

    const confrontos: ConfrontoDoCiclo[] = dias.map((d) => ({
      id: d.id,
      data: d.data ? d.data.toISOString().slice(0, 10) : null,
      status: d.status,
      partidas: d._count.partidas,
    }))
    return NextResponse.json(confrontos)
  } catch (error) {
    console.error('[GET /api/ciclos/:id/confrontos]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
