import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { JogadorForm } from '@/components/jogadores/JogadorForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editar Jogador' }

interface Props {
  params: { id: string }
}

export default async function EditarJogadorPage({ params }: Props) {
  const id = parseInt(params.id)
  const jogador = await prisma.jogador.findUnique({ where: { id } })

  if (!jogador) notFound()

  // Inclui posicoes ativas + as que o jogador ja usa (mesmo que inativas),
  // para nao "sumir" com a selecao atual ao editar.
  const idsAtuais = [jogador.posicaoPrimariaId, jogador.posicaoSecundariaId].filter(
    (x): x is number => x != null
  )
  const posicoes = await prisma.posicao.findMany({
    where: { OR: [{ ativo: true }, { id: { in: idsAtuais } }] },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, sigla: true, cor: true },
  })

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Editar Jogador</h1>
      <JogadorForm
        jogadorId={jogador.id}
        posicoes={posicoes}
        defaultValues={{
          nome: jogador.nome,
          apelido: jogador.apelido ?? undefined,
          posicaoPrimariaId: jogador.posicaoPrimariaId ?? undefined,
          posicaoSecundariaId: jogador.posicaoSecundariaId ?? undefined,
          convidado: jogador.convidado,
        }}
      />
    </div>
  )
}
