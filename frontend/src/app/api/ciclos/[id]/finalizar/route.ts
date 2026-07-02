import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)

    const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })
    if (ciclo.fimEm !== null) {
      return NextResponse.json({ error: 'Ciclo ja esta finalizado' }, { status: 400 })
    }

    const hoje = new Date()
    hoje.setHours(12, 0, 0, 0)

    const atualizado = await prisma.ciclo.update({
      where: { id: cicloId },
      data: { fimEm: hoje },
    })

    return NextResponse.json({
      id: atualizado.id,
      nome: atualizado.nome,
      inicioEm: atualizado.inicioEm.toISOString().split('T')[0],
      fimEm: atualizado.fimEm ? atualizado.fimEm.toISOString().split('T')[0] : null,
    })
  } catch (error) {
    console.error('[POST /api/ciclos/:id/finalizar]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
