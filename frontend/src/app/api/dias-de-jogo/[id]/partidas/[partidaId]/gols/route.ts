import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'

const GolSchema = z.object({
  jogadorId: z.number().int().positive(),
  timeId: z.number().int().positive(),
  assistenciaJogadorId: z.number().int().positive().nullable().optional(),
  // Gol contra: jogador do time adversario; ponto vai para timeId
  golContra: z.boolean().optional().default(false),
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

    const { jogadorId, timeId, assistenciaJogadorId, golContra } = result.data

    const partida = await prisma.partida.findFirst({
      where: { id: pId, diaDeJogoId: diaId },
      include: {
        diaDeJogo: { select: { status: true } },
      },
    })
    if (!partida) return NextResponse.json({ error: 'Partida nao encontrada' }, { status: 404 })

    const isAudit = partida.diaDeJogo.status === 'FINALIZADO' || partida.status === 'FINALIZADA'

    if (!isAudit && partida.status !== 'EM_ANDAMENTO') {
      return NextResponse.json({ error: 'Partida nao esta em andamento' }, { status: 400 })
    }
    if (timeId !== partida.timeAId && timeId !== partida.timeBId) {
      return NextResponse.json({ error: 'Time nao participa desta partida' }, { status: 400 })
    }

    // Limite de 2 gols por time (apenas em jogo ao vivo)
    if (!isAudit) {
      const golsDoTime = await prisma.gol.count({ where: { partidaId: pId, timeId } })
      if (golsDoTime >= 2) {
        return NextResponse.json({ error: 'Time ja atingiu o limite de 2 gols' }, { status: 400 })
      }
    }

    if (golContra) {
      if (assistenciaJogadorId) {
        return NextResponse.json({ error: 'Gol contra nao tem assistencia' }, { status: 400 })
      }
      const timeAdversarioId = timeId === partida.timeAId ? partida.timeBId : partida.timeAId
      const doAdversario = await prisma.jogadorTime.findFirst({
        where: { timeId: timeAdversarioId, jogadorId },
      })
      if (!doAdversario) {
        return NextResponse.json({ error: 'Gol contra deve ser de um jogador do time adversario' }, { status: 400 })
      }
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

    const resultado = await prisma.$transaction(async (tx) => {
      const gol = await tx.gol.create({
        data: { partidaId: pId, timeId, jogadorId, golContra },
      })
      if (assistenciaJogadorId && assistenciaJogadorId !== jogadorId) {
        await tx.assistencia.create({
          data: { golId: gol.id, jogadorId: assistenciaJogadorId },
        })
      }
      const placar = isAudit ? await recalcularVencedor(tx, pId) : null
      return { gol, placar }
    })

    return NextResponse.json(
      {
        id: resultado.gol.id,
        timeId,
        jogadorId,
        jogadorNome: jogador.nome,
        golContra,
        assistenciaJogadorId: assistenciaJogadorId ?? null,
        assistenciaNome,
        ...(resultado.placar ?? {}),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/.../gols]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
