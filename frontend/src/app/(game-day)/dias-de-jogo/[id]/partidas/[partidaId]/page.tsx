'use client'

interface PartidaAoVivoPageProps {
  params: { id: string; partidaId: string }
}

export default function PartidaAoVivoPage({ params }: PartidaAoVivoPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Partida ao Vivo #{params.partidaId}</h1>
    </main>
  )
}
