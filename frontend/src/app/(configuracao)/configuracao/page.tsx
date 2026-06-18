import { prisma } from '@/lib/db'
import { ConfiguracaoForm } from './ConfiguracaoForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configurações' }

export default async function ConfiguracaoPage() {
  const config = await prisma.configuracaoJogos.findUnique({ where: { id: 1 } })

  return (
    <main className="p-6">
      <ConfiguracaoForm diaDeCorteInicial={config?.diaDeCorte ?? null} />
    </main>
  )
}
