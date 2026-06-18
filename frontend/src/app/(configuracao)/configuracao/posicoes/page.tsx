import { prisma } from '@/lib/db'
import { PosicoesManager } from '../PosicoesManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Posições' }

export default async function PosicoesPage() {
  const posicoes = await prisma.posicao.findMany({
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  })

  return (
    <main className="p-6 space-y-6">
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-widest leading-none">
          POSIÇÕES
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          Cadastro das posições dos jogadores
        </p>
      </div>
      <div className="max-w-lg">
        <PosicoesManager posicoesIniciais={posicoes} />
      </div>
    </main>
  )
}
