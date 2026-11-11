import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encerrarCiclo, recalcularPeriodo } from '@/lib/ciclos/periodo'

// Marca o ciclo como atual (unico em aberto). O atual anterior e encerrado
// na data do seu ultimo confronto. Tudo numa transacao.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)

    const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo não encontrado' }, { status: 404 })
    if (ciclo.fimEm === null) {
      return NextResponse.json({ error: 'Este ciclo já é o atual' }, { status: 400 })
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const abertos = await tx.ciclo.findMany({ where: { fimEm: null }, select: { id: true } })
      for (const { id: abertoId } of abertos) await encerrarCiclo(tx, abertoId)
      await tx.ciclo.update({ where: { id: cicloId }, data: { fimEm: null } })
      await recalcularPeriodo(tx, cicloId)
      return tx.ciclo.findUniqueOrThrow({ where: { id: cicloId } })
    })

    return NextResponse.json({
      id: atualizado.id,
      nome: atualizado.nome,
      inicioEm: atualizado.inicioEm.toISOString().split('T')[0],
      fimEm: null,
    })
  } catch (error) {
    console.error('[POST /api/ciclos/:id/atual]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
