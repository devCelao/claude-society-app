import { JogadorForm } from '@/components/jogadores/JogadorForm'

export const metadata = { title: 'Novo Jogador' }

export default function NovoJogadorPage() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Novo Jogador</h1>
      <JogadorForm />
    </div>
  )
}
