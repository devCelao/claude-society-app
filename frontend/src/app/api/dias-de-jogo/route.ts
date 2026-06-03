import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export type DiaDeJogoResumo = {
  id: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  totalJogadores: number
  cicloNome: string | null
}

export async function GET() {
  try {
    const raw = await prisma.diaDeJogo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ciclo: { select: { nome: true } },
        _count: { select: { times: true } },
        times: { select: { _count: { select: { jogadorTimes: true } } } },
      },
    })
    const data: DiaDeJogoResumo[] = raw.map((d) => ({
      id: d.id,
      data: d.data ? d.data.toISOString().split('T')[0] : null,
      status: d.status,
      passo: d._count.times === 3 ? 'principal' : 'lista',
      totalJogadores: d.times.reduce((sum, t) => sum + t._count.jogadorTimes, 0),
      cicloNome: d.ciclo?.nome ?? null,
    }))
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /api/dias-de-jogo]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const bloqueado = await prisma.diaDeJogo.findFirst({
      where: { status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
      select: { id: true, status: true },
    })
    if (bloqueado) {
      const error = bloqueado.status === 'PENDENTE'
        ? 'Ja existe um esquema pendente. Inicie-o antes de criar outro.'
        : 'Ha um confronto em andamento. Finalize-o antes de criar um novo esquema.'
      return NextResponse.json({ error }, { status: 400 })
    }

    const dia = await prisma.diaDeJogo.create({ data: { status: 'PENDENTE' } })
    return NextResponse.json(
      { id: dia.id, data: null, status: dia.status, passo: 'lista', totalJogadores: 0, cicloNome: null },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/dias-de-jogo]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
