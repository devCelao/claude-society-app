import { Suspense } from 'react'
import { DiasDeJogoListagem } from '@/components/game-day/DiasDeJogoListagem'

export const metadata = { title: 'Dias de Jogo' }

// TODO: substituir por prisma
const MOCK_DIAS = [
  { id: 3, data: '2026-05-31', status: 'PENDENTE'   as const, passo: 'lista'     as const, totalJogadores: 0,  cicloNome: 'Maio 2026' },
  { id: 2, data: '2026-05-17', status: 'FINALIZADO' as const, passo: 'principal' as const, totalJogadores: 18, cicloNome: 'Maio 2026' },
  { id: 1, data: '2026-05-03', status: 'FINALIZADO' as const, passo: 'principal' as const, totalJogadores: 16, cicloNome: 'Maio 2026' },
]

export default async function DiasDeJogoPage() {
  return (
    <main className="p-6 space-y-6">
      <Suspense>
        <DiasDeJogoListagem diasIniciais={MOCK_DIAS} />
      </Suspense>
    </main>
  )
}
