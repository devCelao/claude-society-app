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

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Editar Jogador</h1>
      <JogadorForm
        jogadorId={jogador.id}
        defaultValues={{
          nome: jogador.nome,
          apelido: jogador.apelido ?? undefined,
          posicaoPrimaria: jogador.posicaoPrimaria ?? undefined,
          posicaoSecundaria: jogador.posicaoSecundaria ?? undefined,
          convidado: jogador.convidado,
        }}
      />
    </div>
  )
}
