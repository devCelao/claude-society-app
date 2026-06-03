import { prisma } from '@/lib/db'
import { AoVivo } from '@/components/dashboard/AoVivo'
import { DashboardRefresher } from '@/components/dashboard/DashboardRefresher'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

export const metadata = { title: 'Ao Vivo' }

export default async function DashboardPage() {
  const dia = await prisma.diaDeJogo.findFirst({
    where: { status: 'EM_ANDAMENTO' },
    include: {
      ciclo: { select: { nome: true } },
      times: {
        include: {
          jogadorTimes: {
            include: {
              jogador: { select: { id: true, nome: true, apelido: true, convidado: true } },
            },
          },
        },
      },
      partidas: {
        orderBy: { id: 'asc' },
        include: {
          timeA: { select: { id: true, nome: true, cor: true } },
          timeB: { select: { id: true, nome: true, cor: true } },
          gols: {
            orderBy: { id: 'asc' },
            include: {
              jogador: { select: { id: true, nome: true } },
              assistencia: { include: { jogador: { select: { id: true, nome: true } } } },
            },
          },
        },
      },
    },
  })

  return (
    <main className="p-6 space-y-6">
      <DashboardRefresher />
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          AO VIVO
        </h1>
        {dia?.ciclo?.nome && (
          <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
            Ciclo: <span style={{ color: '#f5c400', fontWeight: 600 }}>{dia.ciclo.nome}</span>
          </p>
        )}
      </div>

      {dia ? (
        <AoVivo
          diaId={dia.id}
          data={dia.data!.toISOString().split('T')[0]}
          cicloNome={dia.ciclo?.nome ?? null}
          times={dia.times.map((t) => ({
            id: t.id,
            nome: t.nome,
            cor: t.cor,
            jogadores: t.jogadorTimes.map((jt) => jt.jogador),
          }))}
          partidas={dia.partidas.map((p) => ({
            id: p.id,
            timeAId: p.timeAId,
            timeBId: p.timeBId,
            timeANome: p.timeA.nome,
            timeBNome: p.timeB.nome,
            timeACor: p.timeA.cor,
            timeBCor: p.timeB.cor,
            status: p.status,
            inicioEm: p.inicioEm?.toISOString() ?? null,
            timerAcumuladoMs: p.timerAcumuladoMs,
            vencedorId: p.vencedorId,
            gols: p.gols.map((g) => ({
              id: g.id,
              timeId: g.timeId,
              jogadorId: g.jogadorId,
              jogadorNome: g.jogador.nome,
              assistenciaJogadorId: g.assistencia?.jogadorId ?? null,
              assistenciaJogadorNome: g.assistencia?.jogador.nome ?? null,
            })),
          }))}
        />
      ) : (
        <div
          className="rounded-2xl border p-10 text-center space-y-3"
          style={{ borderColor: '#242424', borderStyle: 'dashed' }}
        >
          <p className="font-barlow-condensed text-sm text-muted-foreground">
            Nenhum confronto em andamento
          </p>
          <Link
            href="/dias-de-jogo"
            className="inline-flex items-center gap-1.5 font-barlow-condensed text-xs tracking-wide"
            style={{ color: '#f5c400' }}
          >
            <CalendarDays size={13} />
            Ir para Dias de Jogo
          </Link>
        </div>
      )}
    </main>
  )
}
