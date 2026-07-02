import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'

const GolEditSchema = z.object({
  jogadorId: z.number().int().positive().optional(),
  assistenciaJogadorId: z.number().int().positive().nullable().optional(),
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
    const result = GolEditSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const gol = await buscarGol(gId, pId, diaId)
    if (!gol) return NextResponse.json({ error: 'Gol nao encontrado' }, { status: 404 })

    const { jogadorId, assistenciaJogadorId } = result.data

    let novoJogadorId = gol.jogadorId
    if (jogadorId !== undefined && jogadorId !== gol.jogadorId) {
      const pertence = await prisma.jogadorTime.findFirst({
        where: { timeId: gol.timeId, jogadorId },
      })
      if (!pertence) {
        return NextResponse.json({ error: 'Jogador nao pertence a este time' }, { status: 400 })
      }
      novoJogadorId = jogadorId
    }

    let novoAssistId =
      assistenciaJogadorId === undefined ? (gol.assistencia?.jogadorId ?? null) : assistenciaJogadorId
    if (novoAssistId === novoJogadorId) {
      novoAssistId = null
    }

    let assistenciaNome: string | null = null
    if (novoAssistId) {
      const jogadorAssist = await prisma.jogador.findUnique({
        where: { id: novoAssistId },
        select: { nome: true },
      })
      if (!jogadorAssist) {
        return NextResponse.json({ error: 'Jogador de assistencia nao encontrado' }, { status: 404 })
      }
      assistenciaNome = jogadorAssist.nome
    }

    await prisma.$transaction(async (tx) => {
      if (novoJogadorId !== gol.jogadorId) {
        await tx.gol.update({ where: { id: gId }, data: { jogadorId: novoJogadorId } })
      }
      if (novoAssistId) {
        await tx.assistencia.upsert({
          where: { golId: gId },
          create: { golId: gId, jogadorId: novoAssistId },
          update: { jogadorId: novoAssistId },
        })
      } else if (gol.assistencia) {
        await tx.assistencia.delete({ where: { golId: gId } })
      }
    })

    return NextResponse.json({
      id: gId,
      jogadorId: novoJogadorId,
      assistenciaJogadorId: novoAssistId,
      assistenciaNome,
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

    const isAudit = gol.partida.diaDeJogo.status === 'FINALIZADO' || gol.partida.status === 'FINALIZADA'

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
