'use client'

import { forwardRef } from 'react'
import { parse } from 'date-fns'
import { getCorTime, COR_NEUTRA } from '@/lib/cores-time'

// Imagem compartilhavel com o resumo do dia (placar, partidas, artilharia).
// Restricoes do html-to-image: estilos inline, larguras fixas, sem grid/fr.

type TimeResumo = { id?: number; nome: string; cor: string; jogadores: { id: number; nome: string }[] }

type PartidaResumo = {
  id: number
  timeAId: number
  timeBId: number
  status: string
  vencedorId: number | null
  golsA: number
  golsB: number
}

interface Props {
  times: TimeResumo[]
  partidas: PartidaResumo[]
  /** gols (sem gols contra) e assistencias por jogadorId */
  statsJogadores: Record<number, { gols: number; assists: number }>
  data: string | null
  cicloNome?: string | null
}

const FONTE_TITULO = 'var(--font-bebas), Impact, sans-serif'
const FONTE_TEXTO = 'var(--font-barlow-condensed), Arial Narrow, sans-serif'
const COR_SECUNDARIA = '#8a8778'
const COR_FUNDO_BOX = '#121212'

function formatarData(iso: string) {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
  const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${semana} · ${diaMes}`
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export const ImagemResumo = forwardRef<HTMLDivElement, Props>(function ImagemResumo(
  { times, partidas, statsJogadores, data, cicloNome },
  ref
) {
  const finalizadas = partidas.filter((p) => p.status === 'FINALIZADA')

  // Placar do dia por time
  const placar = times.map((t) => {
    const jogos = finalizadas.filter((p) => p.timeAId === t.id || p.timeBId === t.id)
    return {
      time: t,
      cor: getCorTime(t.cor),
      vitorias: jogos.filter((p) => p.vencedorId === t.id).length,
      empates: jogos.filter((p) => p.vencedorId === null).length,
      gols: jogos.reduce((s, p) => s + (p.timeAId === t.id ? p.golsA : p.golsB), 0),
    }
  })

  // Campeao do dia: so quando um unico time lidera em vitorias (mesma regra das fotos)
  const maxVitorias = Math.max(0, ...placar.map((p) => p.vitorias))
  const lideres = placar.filter((p) => p.vitorias === maxVitorias)
  const campeao = maxVitorias > 0 && lideres.length === 1 ? lideres[0] : null

  // Artilharia/assistencias: top 5, posicoes empatadas dividem o numero
  const nomeJogador = (id: number) =>
    times.flatMap((t) => t.jogadores).find((j) => j.id === id)?.nome ?? '—'
  const ranking = (campo: 'gols' | 'assists') => {
    const ordenado = Object.entries(statsJogadores)
      .map(([id, s]) => ({ nome: nomeJogador(Number(id)), valor: s[campo] }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 5)
    return ordenado.map((r) => ({
      ...r,
      posicao: ordenado.findIndex((o) => o.valor === r.valor) + 1,
    }))
  }
  const artilheiros = ranking('gols')
  const assistencias = ranking('assists')
  const totalGols = finalizadas.reduce((s, p) => s + p.golsA + p.golsB, 0)

  const timePorId = (id: number) => placar.find((p) => p.time.id === id)

  const label = (texto: string) => (
    <div style={{ fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', color: COR_SECUNDARIA, margin: '2px 0 8px 2px' }}>
      {texto}
    </div>
  )

  const linhaRanking = (r: { nome: string; valor: number; posicao: number }, idx: number, total: number, cor: string) => (
    <div
      key={`${r.nome}-${idx}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
        borderBottom: idx < total - 1 ? '1px solid #1d1d1d' : 'none', fontSize: 16, fontWeight: 600,
      }}
    >
      <span style={{ color: '#5c5a52', width: 14, fontSize: 13, flexShrink: 0 }}>{r.posicao}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</span>
      <span style={{ marginLeft: 'auto', fontFamily: FONTE_TITULO, fontSize: 22, letterSpacing: 1, color: cor, flexShrink: 0 }}>
        {r.valor}
      </span>
    </div>
  )

  return (
    <div
      ref={ref}
      style={{
        width: 720,
        boxSizing: 'border-box',
        padding: '28px 24px 20px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(120% 80% at 0% 0%, #1c1700 0%, #0a0a0a 45%), #0a0a0a',
        color: COR_NEUTRA,
        fontFamily: FONTE_TEXTO,
      }}
    >
      {/* Listras decorativas (dentro dos limites: a captura usa scrollWidth) */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, width: 200, height: 160,
          background: 'repeating-linear-gradient(-45deg, rgba(245,196,0,0.07) 0 10px, transparent 10px 22px)',
        }}
      />

      {/* Cabecalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples */}
        <img
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #f5c400', background: '#111', objectFit: 'cover' }}
        />
        <div>
          <div style={{ fontFamily: FONTE_TITULO, fontSize: 18, letterSpacing: 3, color: '#f5c400', lineHeight: 1 }}>
            Confra Monstra
          </div>
          <div style={{ fontFamily: FONTE_TITULO, fontSize: 46, letterSpacing: 4, lineHeight: 0.95, marginTop: 2 }}>
            Resumo do Dia
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: FONTE_TITULO, fontSize: 26, letterSpacing: 2, lineHeight: 1 }}>
            {data ? formatarData(data) : 'Confronto'}
          </div>
          {cicloNome && (
            <div style={{ fontSize: 13, color: COR_SECUNDARIA, letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>
              Ciclo {cicloNome}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 3, background: 'linear-gradient(90deg, #f5c400, rgba(245,196,0,0))', margin: '18px 0' }} />

      {/* Campeao do dia */}
      {campeao ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14, marginBottom: 16,
            background: `linear-gradient(90deg, ${campeao.cor.hex}2e, ${campeao.cor.hex}08)`,
            border: `1px solid ${campeao.cor.hex}66`,
          }}
        >
          <span style={{ fontSize: 30 }}>🏆</span>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', color: campeao.cor.hex }}>Campeão do dia</div>
            <div style={{ fontFamily: FONTE_TITULO, fontSize: 34, letterSpacing: 3, lineHeight: 1, color: campeao.cor.hex }}>
              {campeao.time.nome}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>
            {plural(campeao.vitorias, 'vitória', 'vitórias')}
            {campeao.empates > 0 && ` · ${plural(campeao.empates, 'empate', 'empates')}`}
            <br />
            <span style={{ color: COR_SECUNDARIA, fontWeight: 500 }}>{plural(campeao.gols, 'gol marcado', 'gols marcados')}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 16px', borderRadius: 14, marginBottom: 16, background: COR_FUNDO_BOX,
            border: '1px solid #262626', fontSize: 15, fontWeight: 600, letterSpacing: 0.5, color: COR_SECUNDARIA,
          }}
        >
          Sem campeão — empate em vitórias
        </div>
      )}

      {/* Placar do dia */}
      {label('Placar do dia')}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {placar.map((p) => (
          <div
            key={p.time.nome}
            style={{
              width: 216, background: COR_FUNDO_BOX, border: `1px solid ${p.cor.hex}40`,
              borderRadius: 14, textAlign: 'center', padding: '10px 0 12px',
            }}
          >
            <div style={{ fontFamily: FONTE_TITULO, fontSize: 22, letterSpacing: 3, color: p.cor.hex }}>{p.time.nome}</div>
            <div style={{ fontFamily: FONTE_TITULO, fontSize: 52, lineHeight: 1, color: p.cor.hex }}>{p.vitorias}</div>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: COR_SECUNDARIA }}>
              {p.vitorias === 1 ? 'vitória' : 'vitórias'}
              {p.empates > 0 && ` · ${plural(p.empates, 'empate', 'empates')}`}
            </div>
          </div>
        ))}
      </div>

      {/* Partidas + artilharia + assistencias */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ width: 260, boxSizing: 'border-box', background: COR_FUNDO_BOX, border: '1px solid #1f1f1f', borderRadius: 14, padding: '10px 14px 6px' }}>
          {label('Partidas')}
          {finalizadas.map((p, idx) => {
            const a = timePorId(p.timeAId)
            const b = timePorId(p.timeBId)
            const corA = p.vencedorId === p.timeAId ? a?.cor.hex ?? COR_NEUTRA : COR_NEUTRA
            const corB = p.vencedorId === p.timeBId ? b?.cor.hex ?? COR_NEUTRA : COR_NEUTRA
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 16, fontWeight: 600,
                  borderBottom: idx < finalizadas.length - 1 ? '1px solid #1d1d1d' : 'none', whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: '#5c5a52', width: 26, fontSize: 13, flexShrink: 0 }}>P{idx + 1}</span>
                <span style={{ color: corA }}>{a?.time.nome}</span>
                <span>{p.golsA} × {p.golsB}</span>
                <span style={{ color: corB }}>{b?.time.nome}</span>
              </div>
            )
          })}
        </div>
        <div style={{ width: 202, boxSizing: 'border-box', background: COR_FUNDO_BOX, border: '1px solid #1f1f1f', borderRadius: 14, padding: '10px 14px 6px' }}>
          {label('Artilheiros ⚽')}
          {artilheiros.length === 0 && <div style={{ fontSize: 14, color: COR_SECUNDARIA, padding: '6px 0' }}>Nenhum gol</div>}
          {artilheiros.map((r, i) => linhaRanking(r, i, artilheiros.length, '#f5c400'))}
        </div>
        <div style={{ width: 202, boxSizing: 'border-box', background: COR_FUNDO_BOX, border: '1px solid #1f1f1f', borderRadius: 14, padding: '10px 14px 6px' }}>
          {label('Assistências 🎯')}
          {assistencias.length === 0 && <div style={{ fontSize: 14, color: COR_SECUNDARIA, padding: '6px 0' }}>Nenhuma</div>}
          {assistencias.map((r, i) => linhaRanking(r, i, assistencias.length, '#3b82f6'))}
        </div>
      </div>

      {/* Rodape */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 16,
          fontSize: 12, color: '#5c5a52', letterSpacing: 1.5, textTransform: 'uppercase',
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>
          {plural(finalizadas.length, 'partida', 'partidas')} · {plural(totalGols, 'gol', 'gols')}
        </span>
        <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: '#f5c400' }}>●</span> Pel@D4 · Soccer</span>
      </div>
    </div>
  )
})
