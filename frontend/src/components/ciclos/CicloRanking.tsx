'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import type { StatJogador, CicloStats } from '@/app/api/ciclos/[id]/route'

type CicloResumo = { id: number; nome: string; inicioEm: string; fimEm: string | null }

interface Props {
  ciclos: CicloResumo[]
  cicloIdInicial: number
}

function TabelaRanking({
  titulo,
  colunaValor,
  dados,
}: {
  titulo: string
  colunaValor: string
  dados: StatJogador[]
}) {
  return (
    <div className="ranking-table">
      <h2
        className="font-bebas tracking-widest text-xl text-center mb-3 pb-2"
        style={{ borderBottom: '2px solid #f5c400', color: '#f5c400' }}
      >
        {titulo}
      </h2>
      <table className="w-full text-sm font-barlow-condensed">
        <thead>
          <tr className="text-muted-foreground text-xs tracking-widest uppercase">
            <th className="text-left py-1.5 w-6">#</th>
            <th className="text-left py-1.5">Nome</th>
            <th className="text-center py-1.5 w-10">{colunaValor}</th>
            <th className="text-center py-1.5 w-8">V</th>
            <th className="text-center py-1.5 w-10">Pts</th>
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                Sem dados neste ciclo
              </td>
            </tr>
          )}
          {dados.map((item, idx) => (
            <tr
              key={item.nome}
              className="border-b transition-colors"
              style={{
                borderColor: '#1a1a1a',
                background: idx === 0 ? 'rgba(245,196,0,0.06)' : 'transparent',
              }}
            >
              <td className="py-2 text-muted-foreground">{item.posicao}º</td>
              <td className="py-2 font-semibold" style={{ color: idx === 0 ? '#f5c400' : '#f0ede0' }}>
                {item.nome}
              </td>
              <td className="py-2 text-center font-bold" style={{ color: idx === 0 ? '#f5c400' : '#f0ede0' }}>
                {item.valor}
              </td>
              <td className="py-2 text-center text-muted-foreground">{item.vitorias}</td>
              <td className="py-2 text-center text-muted-foreground">{item.pontos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatPeriodo(ciclo: CicloResumo): string {
  const inicio = new Date(ciclo.inicioEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fim = ciclo.fimEm
    ? new Date(ciclo.fimEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'em andamento'
  return `${inicio} – ${fim}`
}

function PrintTabela({ titulo, colunaValor, dados }: { titulo: string; colunaValor: string; dados: StatJogador[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px 0', paddingBottom: 5, borderBottom: '2px solid #f5c400', color: '#000' }}>
        {titulo}
      </h2>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            <th style={{ textAlign: 'left', paddingBottom: 4, width: 20 }}>#</th>
            <th style={{ textAlign: 'left', paddingBottom: 4 }}>Nome</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 32 }}>{colunaValor}</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 28 }}>V</th>
            <th style={{ textAlign: 'center', paddingBottom: 4, width: 32 }}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '12px 0', textAlign: 'center', color: '#999', fontSize: 11 }}>Sem dados</td></tr>
          )}
          {dados.map((item, idx) => (
            <tr key={item.nome} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4px 0', color: '#999' }}>{item.posicao}º</td>
              <td style={{ padding: '4px 0', fontWeight: idx === 0 ? 700 : 400 }}>{item.nome}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', fontWeight: 700, color: idx === 0 ? '#b08a00' : '#333' }}>{item.valor}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', color: '#666' }}>{item.vitorias}</td>
              <td style={{ padding: '4px 0', textAlign: 'center', color: '#666' }}>{item.pontos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CicloRanking({ ciclos, cicloIdInicial }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [cicloId, setCicloId] = useState(cicloIdInicial)
  const [stats, setStats] = useState<CicloStats | null>(null)
  const [carregando, setCarregando] = useState(true)

  const cicloAtual = ciclos.find((c) => c.id === cicloId)

  const buscarStats = useCallback(async (id: number) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/ciclos/${id}`)
      if (res.ok) setStats(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (cicloId > 0) buscarStats(cicloId)
    else setCarregando(false)
  }, [cicloId, buscarStats])

  function handleCicloChange(id: number) {
    setCicloId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('cicloId', String(id))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* ── Screen view ────────────────────────────────────────────────────────── */}
      {/* Header */}
      <div className="print:hidden"> 
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-5xl md:text-6xl tracking-widest leading-none text-foreground">
          Ranking
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          Estatísticas por período — gerados automaticamente ao iniciar confrontos
        </p>
      </div>

      {/* Seletor + print */}
      <div className="flex items-center gap-2 print:hidden">
        {ciclos.length > 0 ? (
          <select
            value={cicloId}
            onChange={(e) => handleCicloChange(Number(e.target.value))}
            className="rounded-xl px-4 py-2.5 font-barlow-condensed text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer"
            style={{ background: '#111111', border: '1px solid #242424', minWidth: '180px' }}
          >
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.fimEm === null ? '(ativo)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <p className="font-barlow-condensed text-sm text-muted-foreground">
            Nenhum ciclo ainda — inicie um confronto para criar o primeiro.
          </p>
        )}

        {ciclos.length > 0 && (
          <button
            onClick={() => window.print()}
            title="Imprimir"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ background: '#111111', border: '1px solid #242424', color: '#888888' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f5c400'; e.currentTarget.style.borderColor = 'rgba(245,196,0,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; e.currentTarget.style.borderColor = '#242424' }}
          >
            <Printer size={17} />
          </button>
        )}
      </div>

      {/* Tabelas */}
      {ciclos.length === 0 ? null : carregando ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: '#111111' }} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <TabelaRanking titulo="ARTILHARIA" colunaValor="Gols" dados={stats.artilharia} />
          <TabelaRanking titulo="LIDER EM PASSES" colunaValor="Ass" dados={stats.passes} />
          <TabelaRanking titulo="FOTOS" colunaValor="Fotos" dados={stats.fotos} />
        </div>
      ) : (
        <p className="text-muted-foreground font-barlow-condensed text-sm py-10 text-center print:hidden">
          Sem dados para este ciclo
        </p>
      )}

      {/* ── Print view (ao final — não afeta space-y-6 do conteúdo de tela) ───── */}
      {stats && cicloAtual && (
        <div className="hidden print:block" style={{ fontFamily: 'sans-serif', color: '#000', padding: '0 8px' }}>
          <div style={{ marginBottom: 20, borderBottom: '3px solid #f5c400', paddingBottom: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
              {cicloAtual.nome}
            </h1>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {formatPeriodo(cicloAtual)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            <PrintTabela titulo="Artilharia" colunaValor="Gols" dados={stats.artilharia} />
            <PrintTabela titulo="Lider em Passes" colunaValor="Ass" dados={stats.passes} />
            <PrintTabela titulo="Maior Vencedor" colunaValor="V" dados={stats.fotos} />
          </div>
        </div>
      )}
    </div>
  )
}
