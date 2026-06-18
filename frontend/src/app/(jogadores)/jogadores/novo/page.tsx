import { prisma } from '@/lib/db'
import { JogadorForm } from '@/components/jogadores/JogadorForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Novo Jogador' }

export default async function NovoJogadorPage() {
  const posicoes = await prisma.posicao.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, sigla: true, cor: true },
  })

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Novo Jogador</h1>
      <JogadorForm posicoes={posicoes} />
    </div>
  )
}
