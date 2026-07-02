import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Transição lista → times: persiste passo + jogadores selecionados.
    // Jogadores que saíram da lista sao removidos dos times ja montados (autosave incremental).
    if (body.passo === 'times') {
      const updateData: Record<string, unknown> = { passo: 'times' }
      if (Array.isArray(body.jogadorIds)) updateData.listaJogadorIds = body.jogadorIds
      await prisma.diaDeJogo.update({ where: { id: diaId }, data: updateData })

      if (Array.isArray(body.jogadorIds)) {
        const timesExistentes = await prisma.time.findMany({ where: { diaDeJogoId: diaId }, select: { id: true } })
        if (timesExistentes.length > 0) {
          await prisma.jogadorTime.deleteMany({
            where: {
              timeId: { in: timesExistentes.map((t) => t.id) },
              jogadorId: { notIn: body.jogadorIds },
            },
          })
        }
      }

      return NextResponse.json({ id: diaId, passo: 'times' })
    }

    // Transição times → lista (voltar): apenas troca o passo.
    // Times/jogador_time ja montados sao preservados (autosave incremental cuida da persistencia).
    if (body.passo === 'lista') {
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

    // Transição times → principal: times/jogador_time ja foram persistidos via autosave
    // (PATCH /api/dias-de-jogo/:id/times); aqui so valida e troca o passo.
    if (body.passo === 'principal') {
      const times = await prisma.time.findMany({
        where: { diaDeJogoId: diaId },
        include: { jogadorTimes: true },
      })

      const listaJogadorIds = (dia.listaJogadorIds as number[] | null) ?? []
      const totalDistribuido = times.reduce((s, t) => s + t.jogadorTimes.length, 0)

      if (times.length !== 3 || listaJogadorIds.length === 0 || totalDistribuido !== listaJogadorIds.length) {
        return NextResponse.json(
          { error: 'Distribua todos os jogadores da lista entre os 3 times antes de fechar' },
          { status: 400 }
        )
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
