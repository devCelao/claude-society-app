import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { DiasDeJogoListagem } from '@/components/game-day/DiasDeJogoListagem'

export const metadata = { title: 'Dias de Jogo' }

export default async function DiasDeJogoPage() {
  const raw = await prisma.diaDeJogo.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      ciclo: { select: { nome: true } },
      _count: { select: { times: true } },
      times: { select: { _count: { select: { jogadorTimes: true } } } },
    },
  })

  const dias = raw.map((d) => ({
    id: d.id,
    data: d.data ? d.data.toISOString().split('T')[0] : null,
    status: d.status,
    passo: (d._count.times === 3 && d.passo !== 'times' ? 'principal' : d.passo) as 'lista' | 'times' | 'principal',
    totalJogadores: d.times.reduce((sum, t) => sum + t._count.jogadorTimes, 0),
    cicloNome: d.ciclo?.nome ?? null,
  }))

  return (
    <main className="p-6 space-y-6">
      <Suspense>
        <DiasDeJogoListagem diasIniciais={dias} />
      </Suspense>
    </main>
  )
}
