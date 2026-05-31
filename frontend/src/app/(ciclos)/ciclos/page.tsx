import { Suspense } from 'react'
import { CicloRanking } from '@/components/ciclos/CicloRanking'

export const metadata = { title: 'Ciclos' }

// TODO: substituir por prisma quando banco estiver acessível
const MOCK_CICLOS = [
  { id: 3, nome: 'Maio 2026', inicioEm: '2026-05-01', fimEm: null },
  { id: 2, nome: 'Abril 2026', inicioEm: '2026-04-01', fimEm: '2026-04-30' },
  { id: 1, nome: 'Março 2026', inicioEm: '2026-03-01', fimEm: '2026-03-31' },
]

export default async function CiclosPage({
  searchParams,
}: {
  searchParams: Promise<{ cicloId?: string }>
}) {
  const { cicloId } = await searchParams
  const ciclos = MOCK_CICLOS

  const cicloIdInicial = cicloId
    ? parseInt(cicloId, 10)
    : (ciclos.find((c) => c.fimEm === null)?.id ?? ciclos[0]?.id ?? 1)

  return (
    <main className="p-6 space-y-6">
      <Suspense>
        <CicloRanking ciclos={ciclos} cicloIdInicial={cicloIdInicial} />
      </Suspense>
    </main>
  )
}
