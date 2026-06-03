import { prisma } from '@/lib/db'
import { JogadorListagem } from '@/components/jogadores/JogadorListagem'

export const metadata = { title: 'Jogadores' }

export default async function JogadoresPage() {
  const jogadores = await prisma.jogador.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
  })
  return (
    <main className="p-6 space-y-6">
      <JogadorListagem jogadoresIniciais={jogadores} />
    </main>
  )
}
