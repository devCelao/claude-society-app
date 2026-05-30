interface MontarTimesPageProps {
  params: { id: string }
}

export default function MontarTimesPage({ params }: MontarTimesPageProps) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Montar Times — Dia #{params.id}</h1>
    </main>
  )
}
