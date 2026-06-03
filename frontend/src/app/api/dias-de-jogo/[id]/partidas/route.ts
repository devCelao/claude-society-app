import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const NovaPartidaSchema = z.object({
  timeAId: z.number().int().positive(),
  timeBId: z.number().int().positive(),
  iniciar: z.boolean().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)
    const body = await request.json()
    const result = NovaPartidaSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { timeAId, timeBId, iniciar } = result.data

    if (timeAId === timeBId) {
      return NextResponse.json({ error: 'Times devem ser diferentes' }, { status: 400 })
    }

    const dia = await prisma.diaDeJogo.findUnique({ where: { id: diaId }, select: { status: true } })
    if (!dia) return NextResponse.json({ error: 'Dia de jogo nao encontrado' }, { status: 404 })
    if (dia.status !== 'EM_ANDAMENTO') {
      return NextResponse.json({ error: 'Dia de jogo nao esta em andamento' }, { status: 400 })
    }

    const partida = await prisma.partida.create({
      data: {
        diaDeJogoId: diaId,
        timeAId,
        timeBId,
        status: iniciar ? 'EM_ANDAMENTO' : 'AGUARDANDO',
      },
    })

    return NextResponse.json(
      { id: partida.id, timeAId: partida.timeAId, timeBId: partida.timeBId, status: partida.status },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/dias-de-jogo/:id/partidas]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
