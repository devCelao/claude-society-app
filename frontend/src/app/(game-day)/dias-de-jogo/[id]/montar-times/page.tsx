import { redirect } from 'next/navigation'

export default async function MontarTimesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dias-de-jogo/${id}`)
}
