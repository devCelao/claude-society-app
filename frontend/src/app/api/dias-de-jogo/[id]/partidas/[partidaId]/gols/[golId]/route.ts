import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'

const AssistenciaSchema = z.object({
  assistenciaJogadorId: z.number().int().positive().nullable(),
})

async function recalcularVencedor(
  tx: Prisma.TransactionClient,
  partidaId: number
): Promise<{ golsA: number; golsB: number; vencedorId: number | null }> {
  const partida = await tx.partida.findUnique({
    where: { id: partidaId },
    select: { timeAId: true, timeBId: true, gols: { select: { timeId: true } } },
  })
  if (!partida) return { golsA: 0, golsB: 0, vencedorId: null }
  const golsA = partida.gols.filter((g) => g.timeId === partida.timeAId).length
  const golsB = partida.gols.filter((g) => g.timeId === partida.timeBId).length
  const vencedorId =
    golsA > golsB ? partida.timeAId : golsB > golsA ? partida.timeBId : null
  await tx.partida.update({ where: { id: partidaId }, data: { vencedorId } })
  return { golsA, golsB, vencedorId }
}

async function buscarGol(golId: number, pId: number, diaId: number) {
  return prisma.gol.findFirst({
    where: { id: golId, partida: { id: pId, diaDeJogoId: diaId } },
    include: {
      partida: {
        select: {
          status: true,
          diaDeJogo: { select: { status: true } },
        },
      },
      assistencia: true,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; partidaId: string; golId: string }> }
) {
  try {
    const { id, partidaId, golId } = await params
    const diaId = parseInt(id, 10)
    const pId = parseInt(partidaId, 10)
    const gId = parseInt(golId, 10)

    const body = await request.json()
    const result = AssistenciaSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const gol = await buscarGol(gId, pId, diaId)
    if (!gol) return NextResponse.json({ error: 'Gol nao encontrado' }, { status: 404 })

    const isAudit = gol.partida.diaDeJogo.status === 'FINALIZADO'
    if (!isAudit && gol.partida.status === 'FINALIZADA') {
      return NextResponse.json({ error: 'Partida ja finalizada' }, { status: 400 })
    }

    const { assistenciaJogadorId } = result.data

    if (!assistenciaJogadorId || assistenciaJogadorId === gol.jogadorId) {
      if (gol.assistencia) {
        await prisma.assistencia.delete({ where: { golId: gId } })
      }
      return NextResponse.json({ id: gId, assistenciaJogadorId: null, assistenciaNome: null })
    }

    const jogadorAssist = await prisma.jogador.findUnique({
      where: { id: assistenciaJogadorId },
      select: { nome: true },
    })
    if (!jogadorAssist) {
      return NextResponse.json({ error: 'Jogador de assistencia nao encontrado' }, { status: 404 })
    }

    await prisma.assistencia.upsert({
      where: { golId: gId },
      create: { golId: gId, jogadorId: assistenciaJogadorId },
      update: { jogadorId: assistenciaJogadorId },
    })

    return NextResponse.json({
      id: gId,
      assistenciaJogadorId,
      assistenciaNome: jogadorAssist.nome,
    })
  } catch (error) {
    console.error('[PATCH /api/.../gols/:golId]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; partidaId: string; golId: string }> }
) {
  try {
    const { id, partidaId, golId } = await params
    const diaId = parseInt(id, 10)
    const pId = parseInt(partidaId, 10)
    const gId = parseInt(golId, 10)

    const gol = await buscarGol(gId, pId, diaId)
    if (!gol) return NextResponse.json({ error: 'Gol nao encontrado' }, { status: 404 })

    const isAudit = gol.partida.diaDeJogo.status === 'FINALIZADO'
    if (!isAudit && gol.partida.status === 'FINALIZADA') {
      return NextResponse.json({ error: 'Partida ja finalizada' }, { status: 400 })
    }

    const resultado = await prisma.$transaction(async (tx) => {
      await tx.gol.delete({ where: { id: gId } })
      if (isAudit) return recalcularVencedor(tx, pId)
      return null
    })

    return NextResponse.json(resultado ?? {}, { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/.../gols/:golId]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
