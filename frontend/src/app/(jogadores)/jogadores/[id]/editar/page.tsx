interface EditarJogadorPageProps {
  params: { id: string }
}

export default function EditarJogadorPage({ params }: EditarJogadorPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Editar Jogador #{params.id}</h1>
    </main>
  )
}
