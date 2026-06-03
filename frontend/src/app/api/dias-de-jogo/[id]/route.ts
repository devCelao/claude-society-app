import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MontarTimesSchema } from '@/lib/validations/dia-de-jogo'

export type JogadorLista = { id: number; nome: string; apelido: string | null; convidado: boolean }
export type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'
export type TimeFormado = { id: number; nome: string; cor: CorTime; jogadores: JogadorLista[] }

export type DiaDeJogoDetalhe = {
  id: number
  data: string | null
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  jogadoresSelecionados: JogadorLista[]
  times: TimeFormado[]
  todosJogadores: JogadorLista[]
  cicloNome: string | null
}

async function fetchDia(id: number) {
  return prisma.diaDeJogo.findUnique({
    where: { id },
    include: {
      ciclo: { select: { nome: true } },
      times: {
        include: {
          jogadorTimes: {
            include: { jogador: { select: { id: true, nome: true, apelido: true, convidado: true } } },
          },
        },
      },
      partidas: { select: { id: true, timeAId: true, timeBId: true, status: true } },
    },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)
    const dia = await fetchDia(diaId)
    if (!dia) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    const todosJogadores = await prisma.jogador.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, apelido: true, convidado: true },
    })

    const jogadoresSelecionados = dia.times.flatMap((t) => t.jogadorTimes.map((jt) => jt.jogador))
    const seen = new Set<number>()
    const jogadoresUnicos = jogadoresSelecionados.filter((j) => {
      if (seen.has(j.id)) return false
      seen.add(j.id)
      return true
    })

    const times: TimeFormado[] = dia.times.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor as CorTime,
      jogadores: t.jogadorTimes.map((jt) => jt.jogador),
    }))

    const body: DiaDeJogoDetalhe = {
      id: dia.id,
      data: dia.data ? dia.data.toISOString().split('T')[0] : null,
      status: dia.status,
      passo: dia.times.length === 3 ? 'principal' : 'lista',
      jogadoresSelecionados: jogadoresUnicos,
      times,
      todosJogadores,
      cicloNome: dia.ciclo?.nome ?? null,
    }

    return NextResponse.json(body)
  } catch (error) {
    console.error('[GET /api/dias-de-jogo/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)
    const body = await request.json()

    const dia = await prisma.diaDeJogo.findUnique({ where: { id: diaId } })
    if (!dia) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    // Transição lista → times: persiste passo + jogadores selecionados
    if (body.passo === 'times') {
      const updateData: Record<string, unknown> = { passo: 'times' }
      if (Array.isArray(body.jogadorIds)) updateData.listaJogadorIds = body.jogadorIds
      await prisma.diaDeJogo.update({ where: { id: diaId }, data: updateData })
      return NextResponse.json({ id: diaId, passo: 'times' })
    }

    // Transição times → lista (voltar): remove times e volta passo
    if (body.passo === 'lista') {
      const existentes = await prisma.time.findMany({ where: { diaDeJogoId: diaId }, select: { id: true } })
      if (existentes.length > 0) {
        await prisma.jogadorTime.deleteMany({ where: { timeId: { in: existentes.map((t) => t.id) } } })
        await prisma.time.deleteMany({ where: { diaDeJogoId: diaId } })
      }
      await prisma.diaDeJogo.update({ where: { id: diaId }, data: { passo: 'lista' } })
      return NextResponse.json({ id: diaId, passo: 'lista' })
    }

    // Editar times (principal → times): se EM_ANDAMENTO, desfaz a iniciação
    if (body.passo === 'editar') {
      if (dia.status === 'EM_ANDAMENTO') {
        // Deleta partidas (gols primeiro; assistências cascadeiam dos gols)
        const partidaIds = (await prisma.partida.findMany({
          where: { diaDeJogoId: diaId },
          select: { id: true },
        })).map((p) => p.id)

        if (partidaIds.length > 0) {
          await prisma.gol.deleteMany({ where: { partidaId: { in: partidaIds } } })
          await prisma.partida.deleteMany({ where: { diaDeJogoId: diaId } })
        }

        await prisma.diaDeJogo.update({
          where: { id: diaId },
          data: { passo: 'times', status: 'PENDENTE', data: null, cicloId: null },
        })
      } else {
        await prisma.diaDeJogo.update({ where: { id: diaId }, data: { passo: 'times' } })
      }

      return NextResponse.json({ id: diaId, passo: 'times', status: dia.status === 'EM_ANDAMENTO' ? 'PENDENTE' : dia.status })
    }

    // Transição times → principal: cria times com jogadores
    if (body.passo === 'principal' && body.times) {
      const result = MontarTimesSchema.safeParse({ times: body.times })
      if (!result.success) {
        return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
      }

      // Remove times existentes
      const existentes = await prisma.time.findMany({ where: { diaDeJogoId: diaId }, select: { id: true } })
      if (existentes.length > 0) {
        await prisma.jogadorTime.deleteMany({ where: { timeId: { in: existentes.map((t) => t.id) } } })
        await prisma.time.deleteMany({ where: { diaDeJogoId: diaId } })
      }

      for (const t of result.data.times) {
        const time = await prisma.time.create({
          data: { diaDeJogoId: diaId, nome: t.nome, cor: t.cor },
        })
        await prisma.jogadorTime.createMany({
          data: t.jogadorIds.map((jogadorId) => ({ timeId: time.id, jogadorId })),
        })
      }

      await prisma.diaDeJogo.update({ where: { id: diaId }, data: { passo: 'principal' } })
      return NextResponse.json({ id: diaId, passo: 'principal', status: 'PENDENTE' })
    }

    // Atualização genérica de status
    if (body.status) {
      if (body.status === 'FINALIZADO') {
        // Garante consistência: encerra todas as partidas que não foram finalizadas
        await prisma.partida.updateMany({
          where: { diaDeJogoId: diaId, status: { not: 'FINALIZADA' } },
          data: { status: 'FINALIZADA', inicioEm: null, fimEm: new Date() },
        })
      }

      const atualizado = await prisma.diaDeJogo.update({
        where: { id: diaId },
        data: { status: body.status },
      })
      return NextResponse.json({ id: atualizado.id, status: atualizado.status })
    }

    return NextResponse.json({ error: 'Nenhuma operacao reconhecida' }, { status: 400 })
  } catch (error) {
    console.error('[PATCH /api/dias-de-jogo/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
