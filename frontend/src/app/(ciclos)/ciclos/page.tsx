import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { CicloRanking } from '@/components/ciclos/CicloRanking'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ciclos' }

export default async function CiclosPage({
  searchParams,
}: {
  searchParams: Promise<{ cicloId?: string }>
}) {
  const { cicloId } = await searchParams

  const raw = await prisma.ciclo.findMany({
    orderBy: { inicioEm: 'desc' },
    select: { id: true, nome: true, inicioEm: true, fimEm: true },
  })

  const ciclos = raw.map((c) => ({
    id: c.id,
    nome: c.nome,
    inicioEm: c.inicioEm.toISOString().split('T')[0],
    fimEm: c.fimEm ? c.fimEm.toISOString().split('T')[0] : null,
  }))

  const cicloIdInicial = cicloId
    ? parseInt(cicloId, 10)
    : (ciclos.find((c) => c.fimEm === null)?.id ?? ciclos[0]?.id ?? 0)

  return (
    <main className="p-6 space-y-6">
      <Suspense>
        <CicloRanking ciclos={ciclos} cicloIdInicial={cicloIdInicial} />
      </Suspense>
    </main>
  )
}
