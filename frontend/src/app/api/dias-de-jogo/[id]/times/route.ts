import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SincronizarTimesSchema } from '@/lib/validations/dia-de-jogo'

const JOGADOR_SELECT = {
  id: true,
  nome: true,
  apelido: true,
  convidado: true,
  posicaoPrimaria: { select: { sigla: true } },
  posicaoSecundaria: { select: { sigla: true } },
} as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)
    const times = await prisma.time.findMany({
      where: { diaDeJogoId: diaId },
      orderBy: { id: 'asc' },
      include: {
        jogadorTimes: {
          include: { jogador: { select: JOGADOR_SELECT } },
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

// Sincroniza a composicao dos times a cada acao (add/remover jogador, sortear, mudar cor).
// Cria os 3 times na primeira chamada; nas seguintes, ajusta apenas o que mudou (diff).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)

    const dia = await prisma.diaDeJogo.findUnique({ where: { id: diaId } })
    if (!dia) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    const body = await request.json()
    const result = SincronizarTimesSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const timesInput = result.data.times

    const todosIds = timesInput.flatMap((t) => t.jogadorIds)
    if (new Set(todosIds).size !== todosIds.length) {
      return NextResponse.json({ error: 'Um jogador nao pode estar em mais de um time' }, { status: 400 })
    }

    let existentes = await prisma.time.findMany({
      where: { diaDeJogoId: diaId },
      orderBy: { id: 'asc' },
      include: { jogadorTimes: { select: { jogadorId: true } } },
    })

    if (existentes.length === 0) {
      for (const t of timesInput) {
        await prisma.time.create({ data: { diaDeJogoId: diaId, nome: t.nome, cor: t.cor } })
      }
      existentes = await prisma.time.findMany({
        where: { diaDeJogoId: diaId },
        orderBy: { id: 'asc' },
        include: { jogadorTimes: { select: { jogadorId: true } } },
      })
    }

    if (existentes.length !== timesInput.length) {
      return NextResponse.json({ error: 'Numero de times inconsistente' }, { status: 400 })
    }

    for (let i = 0; i < existentes.length; i++) {
      const time = existentes[i]
      const alvo = timesInput[i]

      const atuaisIds = new Set(time.jogadorTimes.map((jt) => jt.jogadorId))
      const alvoIds = new Set(alvo.jogadorIds)

      const paraRemover = Array.from(atuaisIds).filter((jid) => !alvoIds.has(jid))
      const paraAdicionar = Array.from(alvoIds).filter((jid) => !atuaisIds.has(jid))

      if (paraRemover.length > 0) {
        await prisma.jogadorTime.deleteMany({
          where: { timeId: time.id, jogadorId: { in: paraRemover } },
        })
      }
      if (paraAdicionar.length > 0) {
        await prisma.jogadorTime.createMany({
          data: paraAdicionar.map((jogadorId) => ({ timeId: time.id, jogadorId })),
        })
      }
      if (time.nome !== alvo.nome || time.cor !== alvo.cor) {
        await prisma.time.update({ where: { id: time.id }, data: { nome: alvo.nome, cor: alvo.cor } })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/dias-de-jogo/:id/times]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
