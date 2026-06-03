import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)

    const dia = await prisma.diaDeJogo.findUnique({ where: { id: diaId } })
    if (!dia) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    if (dia.status !== 'EM_ANDAMENTO') {
      return NextResponse.json({ error: 'Confronto nao esta em andamento' }, { status: 400 })
    }

    const partidaIds = (
      await prisma.partida.findMany({ where: { diaDeJogoId: diaId }, select: { id: true } })
    ).map((p) => p.id)

    if (partidaIds.length > 0) {
      await prisma.gol.deleteMany({ where: { partidaId: { in: partidaIds } } })
      await prisma.partida.deleteMany({ where: { diaDeJogoId: diaId } })
    }

    await prisma.diaDeJogo.update({
      where: { id: diaId },
      data: { status: 'PENDENTE', data: null, cicloId: null, passo: 'principal' },
    })

    return NextResponse.json({ id: diaId, status: 'PENDENTE' })
  } catch (error) {
    console.error('[POST /api/dias-de-jogo/:id/anular]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
