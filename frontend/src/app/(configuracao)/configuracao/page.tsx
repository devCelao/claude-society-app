import { prisma } from '@/lib/db'
import { ConfiguracaoForm } from './ConfiguracaoForm'

export const metadata = { title: 'Configurações' }

export default async function ConfiguracaoPage() {
  const config = await prisma.configuracaoJogos.findUnique({ where: { id: 1 } })

  return (
    <main className="p-6">
      <ConfiguracaoForm
        corteInicioInicial={config?.corteInicio ? config.corteInicio.toISOString().split('T')[0] : null}
        corteFimInicial={config?.corteFim ? config.corteFim.toISOString().split('T')[0] : null}
      />
    </main>
  )
}
