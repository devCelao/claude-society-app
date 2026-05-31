import { Suspense } from 'react'
import { AoVivo } from '@/components/dashboard/AoVivo'
import type { DashboardData } from '@/app/api/dashboard/route'

export const metadata = { title: 'Dashboard' }

async function getDashboardData(): Promise<DashboardData> {
  // TODO: substituir por chamada prisma direta quando banco estiver acessível
  // Por ora chama a própria API (para não duplicar a lógica mock)
  try {
    const res = await fetch('http://localhost:3000/api/dashboard', { cache: 'no-store' })
    if (res.ok) return res.json()
  } catch {}

  return { diaAtivo: null, stats: { artilheiro: null, liderPasse: null, liderFoto: null, cicloNome: '' } }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <main className="p-6 space-y-6">
      {/* Barra de título */}
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          DASHBOARD
        </h1>
        {data.stats.cicloNome && (
          <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
            Ciclo atual:{' '}
            <span style={{ color: '#f5c400', fontWeight: 600 }}>{data.stats.cicloNome}</span>
          </p>
        )}
      </div>

      {/* Ao Vivo — só renderiza se houver dia ativo */}
      {data.diaAtivo && (
        <Suspense>
          <AoVivo initialData={data} />
        </Suspense>
      )}

      {/* Placeholder para as demais seções do dashboard */}
      {!data.diaAtivo && (
        <div
          className="rounded-2xl border p-10 text-center font-barlow-condensed text-sm text-muted-foreground"
          style={{ borderColor: '#242424', borderStyle: 'dashed' }}
        >
          Nenhum dia de jogo em andamento
        </div>
      )}
    </main>
  )
}
