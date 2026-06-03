import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const EncerrarPartidaSchema = z.object({
  status: z.literal('FINALIZADA'),
  vencedorId: z.number().int().positive().nullable(),
})

const TimerActionSchema = z.object({
  action: z.literal('timer'),
  inicioEm: z.string().nullable(),
  timerAcumuladoMs: z.number().int().min(0),
})

const PatchBodySchema = z.union([TimerActionSchema, EncerrarPartidaSchema])

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const { id, partidaId } = await params
    const partida = await prisma.partida.findFirst({
      where: { id: parseInt(partidaId, 10), diaDeJogoId: parseInt(id, 10) },
      include: {
        timeA: { select: { id: true, nome: true, cor: true } },
        timeB: { select: { id: true, nome: true, cor: true } },
        gols: { select: { timeId: true, jogadorId: true } },
      },
    })
    if (!partida) return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 })
    return NextResponse.json(partida)
  } catch (error) {
    console.error('[GET /api/dias-de-jogo/:id/partidas/:partidaId]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const { id, partidaId } = await params
    const diaId = parseInt(id, 10)
    const pId = parseInt(partidaId, 10)

    const body = await request.json()
    const result = PatchBodySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const partida = await prisma.partida.findFirst({
      where: { id: pId, diaDeJogoId: diaId },
    })
    if (!partida) return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 })

    if ('action' in result.data) {
      if (partida.status === 'FINALIZADA') {
        return NextResponse.json({ error: 'Partida ja finalizada' }, { status: 400 })
      }
      const atualizada = await prisma.partida.update({
        where: { id: pId },
        data: {
          inicioEm: result.data.inicioEm ? new Date(result.data.inicioEm) : null,
          timerAcumuladoMs: result.data.timerAcumuladoMs,
        },
      })
      return NextResponse.json({ id: atualizada.id, inicioEm: atualizada.inicioEm, timerAcumuladoMs: atualizada.timerAcumuladoMs })
    }

    if (partida.status === 'FINALIZADA') {
      return NextResponse.json({ error: 'Partida ja finalizada' }, { status: 400 })
    }

    const atualizada = await prisma.partida.update({
      where: { id: pId },
      data: {
        status: 'FINALIZADA',
        vencedorId: result.data.vencedorId,
        fimEm: new Date(),
      },
    })

    return NextResponse.json({ id: atualizada.id, status: atualizada.status, vencedorId: atualizada.vencedorId })
  } catch (error) {
    console.error('[PATCH /api/dias-de-jogo/:id/partidas/:partidaId]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
