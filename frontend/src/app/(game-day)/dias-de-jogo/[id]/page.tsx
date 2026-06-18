import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { DiaDeJogoFlow, type Jogador, type TimeFormado, type Partida } from '@/components/game-day/DiaDeJogoFlow'

export const dynamic = 'force-dynamic'

export default async function DiaDeJogoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const diaId = parseInt(id, 10)

  const dia = await prisma.diaDeJogo.findUnique({
    where: { id: diaId },
    include: {
      times: {
        include: {
          jogadorTimes: {
            include: { jogador: { select: { id: true, nome: true, apelido: true, convidado: true, posicaoPrimaria: { select: { sigla: true } }, posicaoSecundaria: { select: { sigla: true } } } } },
          },
        },
      },
      partidas: {
      orderBy: { id: 'asc' },
      include: {
        timeA: { select: { nome: true, cor: true } },
        timeB: { select: { nome: true, cor: true } },
        gols: { select: { timeId: true } },
      },
    },
    },
  })

  if (!dia) notFound()

  const todosJogadores: Jogador[] = await prisma.jogador.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, apelido: true, convidado: true, posicaoPrimaria: { select: { sigla: true } }, posicaoSecundaria: { select: { sigla: true } } },
  })

  // passo='times' com times formados = usuário está editando; qualquer outro caso com times=3 é 'principal'
  const passoDB = dia.passo as 'lista' | 'times' | 'principal'
  const passo: 'lista' | 'times' | 'principal' =
    dia.times.length === 3 && passoDB !== 'times' ? 'principal' : passoDB

  let jogadoresSelecionados: Jogador[]
  if (passo === 'principal') {
    const seen = new Set<number>()
    jogadoresSelecionados = dia.times
      .flatMap((t) => t.jogadorTimes.map((jt) => jt.jogador))
      .filter((j) => {
        if (seen.has(j.id)) return false
        seen.add(j.id)
        return true
      })
  } else {
    const ids = dia.listaJogadorIds as number[] | null
    jogadoresSelecionados = ids?.length
      ? todosJogadores.filter((j) => ids.includes(j.id))
      : []
  }

  const times: TimeFormado[] = dia.times.map((t) => ({
    id: t.id,
    nome: t.nome,
    cor: t.cor as TimeFormado['cor'],
    jogadores: t.jogadorTimes.map((jt) => jt.jogador),
  }))

  const partidas: Partida[] = dia.partidas.map((p) => ({
    id: p.id,
    timeAId: p.timeAId,
    timeBId: p.timeBId,
    timeANome: p.timeA.nome,
    timeACor: p.timeA.cor,
    timeBNome: p.timeB.nome,
    timeBCor: p.timeB.cor,
    status: p.status,
    vencedorId: p.vencedorId,
    golsA: p.gols.filter((g) => g.timeId === p.timeAId).length,
    golsB: p.gols.filter((g) => g.timeId === p.timeBId).length,
  }))

  const golsDia = await prisma.gol.findMany({
    where: { partida: { diaDeJogoId: diaId } },
    select: { jogadorId: true, assistencia: { select: { jogadorId: true } } },
  })

  const statsJogadores: Record<number, { gols: number; assists: number }> = {}
  for (const gol of golsDia) {
    if (!statsJogadores[gol.jogadorId]) statsJogadores[gol.jogadorId] = { gols: 0, assists: 0 }
    statsJogadores[gol.jogadorId].gols++
    if (gol.assistencia) {
      const aId = gol.assistencia.jogadorId
      if (!statsJogadores[aId]) statsJogadores[aId] = { gols: 0, assists: 0 }
      statsJogadores[aId].assists++
    }
  }

  return (
    <main className="p-6">
      <DiaDeJogoFlow
        diaId={dia.id}
        data={dia.data ? dia.data.toISOString().split('T')[0] : null}
        status={dia.status}
        passoinicial={passo}
        jogadoresSelecionadosInicial={jogadoresSelecionados}
        timesIniciais={times}
        todosJogadores={todosJogadores}
        partidasIniciais={partidas}
        statsJogadores={statsJogadores}
      />
    </main>
  )
}
