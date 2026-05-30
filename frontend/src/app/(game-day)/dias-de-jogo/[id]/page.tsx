interface DiaDeJogoPageProps {
  params: { id: string }
}

export default function DiaDeJogoPage({ params }: DiaDeJogoPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Dia de Jogo #{params.id}</h1>
    </main>
  )
}
