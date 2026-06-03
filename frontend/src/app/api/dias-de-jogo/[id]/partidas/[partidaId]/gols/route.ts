import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const GolSchema = z.object({
  jogadorId: z.number().int().positive(),
  timeId: z.number().int().positive(),
  assistenciaJogadorId: z.number().int().positive().nullable().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const { id, partidaId } = await params
    const diaId = parseInt(id, 10)
    const pId = parseInt(partidaId, 10)

    const body = await request.json()
    const result = GolSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { jogadorId, timeId, assistenciaJogadorId } = result.data

    const partida = await prisma.partida.findFirst({
      where: { id: pId, diaDeJogoId: diaId },
      include: { timeA: { select: { id: true } }, timeB: { select: { id: true } } },
    })
    if (!partida) return NextResponse.json({ error: 'Partida nao encontrada' }, { status: 404 })
    if (partida.status !== 'EM_ANDAMENTO') {
      return NextResponse.json({ error: 'Partida nao esta em andamento' }, { status: 400 })
    }
    if (timeId !== partida.timeAId && timeId !== partida.timeBId) {
      return NextResponse.json({ error: 'Time nao participa desta partida' }, { status: 400 })
    }

    const jogador = await prisma.jogador.findUnique({
      where: { id: jogadorId },
      select: { nome: true },
    })
    if (!jogador) return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })

    let assistenciaNome: string | null = null
    if (assistenciaJogadorId && assistenciaJogadorId !== jogadorId) {
      const assist = await prisma.jogador.findUnique({
        where: { id: assistenciaJogadorId },
        select: { nome: true },
      })
      assistenciaNome = assist?.nome ?? null
    }

    const gol = await prisma.gol.create({
      data: { partidaId: pId, timeId, jogadorId },
    })

    if (assistenciaJogadorId && assistenciaJogadorId !== jogadorId) {
      await prisma.assistencia.create({
        data: { golId: gol.id, jogadorId: assistenciaJogadorId },
      })
    }

    return NextResponse.json(
      {
        id: gol.id,
        timeId,
        jogadorId,
        jogadorNome: jogador.nome,
        assistenciaJogadorId: assistenciaJogadorId ?? null,
        assistenciaNome,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/.../gols]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
