import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)
    const times = await prisma.time.findMany({
      where: { diaDeJogoId: diaId },
      include: {
        jogadorTimes: {
          include: { jogador: { select: { id: true, nome: true, apelido: true, convidado: true } } },
        },
      },
    })
    return NextResponse.json(times.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor,
      jogadores: t.jogadorTimes.map((jt) => jt.jogador),
    })))
  } catch (error) {
    console.error('[GET /api/dias-de-jogo/:id/times]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Use PATCH /api/dias-de-jogo/:id com passo=principal para montar times' },
    { status: 400 }
  )
}
