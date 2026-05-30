interface CicloPageProps {
  params: { id: string }
}

export default function CicloPage({ params }: CicloPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Ciclo #{params.id}</h1>
    </main>
  )
}
