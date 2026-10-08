'use client'

import { forwardRef } from 'react'
import { parse } from 'date-fns'
import { getCorTime } from '@/lib/cores-time'

// Layout da imagem compartilhavel dos times (gerada via html-to-image).
// Restricoes do html-to-image: estilos inline, larguras fixas, sem grid/fr.

export type PosicaoImagem = { sigla: string; cor: string; ordem: number } | null

type JogadorImagem = {
  id: number
  nome: string
  convidado: boolean
  posicaoPrimaria?: PosicaoImagem
}

type TimeImagem = { nome: string; cor: string; jogadores: JogadorImagem[] }

interface Props {
  times: TimeImagem[]
  /** yyyy-MM-dd; null enquanto o confronto nao foi iniciado */
  data: string | null
  cicloNome?: string | null
}

const FONTE_TITULO = 'var(--font-bebas), Impact, sans-serif'
const FONTE_TEXTO = 'var(--font-barlow-condensed), Arial Narrow, sans-serif'

function formatarData(iso: string) {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
  const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${semana} · ${diaMes}`
}

// Goleiro primeiro, depois defesa/meio/ataque (ordem do cadastro de posicoes); sem posicao no fim
function ordenarPorPosicao(jogadores: JogadorImagem[]) {
  return [...jogadores].sort((a, b) => {
    const oa = a.posicaoPrimaria?.ordem ?? Number.MAX_SAFE_INTEGER
    const ob = b.posicaoPrimaria?.ordem ?? Number.MAX_SAFE_INTEGER
    return oa - ob || a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

export const ImagemTimes = forwardRef<HTMLDivElement, Props>(function ImagemTimes(
  { times, data, cicloNome },
  ref
) {
  const totalJogadores = times.reduce((s, t) => s + t.jogadores.length, 0)

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
        color: '#f0ede0',
        fontFamily: FONTE_TEXTO,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
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
            Times do Dia
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: FONTE_TITULO, fontSize: 26, letterSpacing: 2, lineHeight: 1 }}>
            {data ? formatarData(data) : 'Confronto'}
          </div>
          {cicloNome && (
            <div style={{ fontSize: 13, color: '#8a8778', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>
              Ciclo {cicloNome}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 3, background: 'linear-gradient(90deg, #f5c400, rgba(245,196,0,0))', margin: '18px 0' }} />

      {/* Times */}
      <div style={{ display: 'flex', gap: 12 }}>
        {times.map((time) => {
          const cor = getCorTime(time.cor)
          return (
            <div
              key={time.nome}
              style={{ width: 216, background: '#121212', border: `1px solid ${cor.hex}40`, borderRadius: 14, overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '10px 12px 9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: `linear-gradient(180deg, ${cor.hex}26, ${cor.hex}0d)`,
                  borderBottom: `2px solid ${cor.hex}`,
                }}
              >
                <span style={{ fontFamily: FONTE_TITULO, fontSize: 26, letterSpacing: 3, lineHeight: 1, color: cor.hex }}>
                  {time.nome}
                </span>
                <span
                  style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
                    padding: '3px 7px', borderRadius: 6, background: cor.hex, color: cor.texto,
                  }}
                >
                  {cor.label}
                </span>
              </div>

              <div style={{ padding: '6px 8px 10px' }}>
                {ordenarPorPosicao(time.jogadores).map((j, idx, arr) => {
                  const pos = j.posicaoPrimaria
                  return (
                    <div
                      key={j.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px',
                        borderBottom: idx < arr.length - 1 ? '1px solid #1d1d1d' : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 30, flexShrink: 0, textAlign: 'center', fontSize: 10, fontWeight: 700,
                          letterSpacing: 1, padding: '2px 0', borderRadius: 4,
                          color: pos?.cor ?? '#555', background: pos ? `${pos.cor}1f` : '#1a1a1a',
                        }}
                      >
                        {pos?.sigla ?? '—'}
                      </span>
                      <span
                        style={{
                          fontSize: 15, fontWeight: 600, letterSpacing: 0.3,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {j.nome}
                      </span>
                      {j.convidado && (
                        <span
                          style={{
                            marginLeft: 'auto', flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                            color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', padding: '1px 4px', borderRadius: 4,
                          }}
                        >
                          CONV
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rodape */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 16,
          fontSize: 12, color: '#5c5a52', letterSpacing: 1.5, textTransform: 'uppercase',
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{totalJogadores} jogadores · {times.length} times</span>
        <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: '#f5c400' }}>●</span> Pel@D4 · Soccer</span>
      </div>
    </div>
  )
})
