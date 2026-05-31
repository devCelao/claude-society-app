'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Jogador } from '@/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const POSITION_STYLES: Record<string, { color: string; bg: string }> = {
  Goleiro:      { color: '#f5c400', bg: '#1e1800' },
  Zagueiro:     { color: '#60a5fa', bg: '#07142a' },
  Lateral:      { color: '#67e8f9', bg: '#051820' },
  'Meio-campo': { color: '#c084fc', bg: '#130430' },
  Atacante:     { color: '#fb923c', bg: '#1e0e00' },
  Ponta:        { color: '#f87171', bg: '#1e0606' },
}

const AVATAR_PALETTE = [
  { bg: '#1e1800', color: '#f5c400' },
  { bg: '#1a0e00', color: '#fb923c' },
  { bg: '#1e0000', color: '#fca5a5' },
  { bg: '#0e0020', color: '#c084fc' },
  { bg: '#001820', color: '#67e8f9' },
  { bg: '#001208', color: '#6ee7b7' },
]

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface Props {
  jogador: Jogador
  suspenso?: boolean
  onReativar?: (id: number) => void
  animDelay?: number
}

export function JogadorCard({ jogador, suspenso = false, onReativar, animDelay = 0 }: Props) {
  const router = useRouter()
  const [reativando, setReativando] = useState(false)
  const [hovered, setHovered] = useState(false)

  const avatar = AVATAR_PALETTE[jogador.id % AVATAR_PALETTE.length]
  const posStyle = jogador.posicao
    ? (POSITION_STYLES[jogador.posicao] ?? { color: '#9ca3af', bg: '#1a1a1a' })
    : null

  async function handleSuspender() {
    const res = await fetch(`/api/jogadores/${jogador.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao suspender jogador')
      return
    }
    toast.success('Jogador suspenso')
    router.refresh()
  }

  async function handleReativar() {
    setReativando(true)
    try {
      const res = await fetch(`/api/jogadores/${jogador.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedAt: null }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao reativar jogador')
        return
      }
      toast.success('Jogador reativado')
      onReativar?.(jogador.id)
    } finally {
      setReativando(false)
    }
  }

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${animDelay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-xl p-3.5 flex items-center gap-3 transition-all"
        style={{
          background: hovered
            ? suspenso ? '#180808' : '#191919'
            : suspenso ? '#130606' : '#111111',
          border: `1px solid ${
            suspenso
              ? 'rgba(248,113,113,0.2)'
              : hovered ? '#3a3510' : '#242424'
          }`,
          boxShadow: suspenso
            ? 'inset 3px 0 0 #f87171'
            : hovered ? 'inset 3px 0 0 #f5c400' : 'none',
          opacity: suspenso ? 0.75 : 1,
        }}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-bebas text-base tracking-wide"
          style={{
            background: avatar.bg,
            color: avatar.color,
            border: `1.5px solid ${avatar.color}28`,
          }}
        >
          {initials(jogador.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span
              className="text-[15px] font-semibold font-barlow"
              style={{ color: suspenso ? '#555555' : '#f0ede0' }}
            >
              {jogador.nome}
            </span>
            {jogador.apelido && (
              <span className="text-sm text-muted-foreground font-barlow-condensed">
                ({jogador.apelido})
              </span>
            )}
            {jogador.convidado && (
              <span
                className="font-barlow-condensed text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(245,196,0,0.09)',
                  color: '#f5c400',
                  border: '1px solid rgba(245,196,0,0.18)',
                }}
              >
                VISITANTE
              </span>
            )}
            {suspenso && (
              <span
                className="font-barlow-condensed text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(248,113,113,0.09)',
                  color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.18)',
                }}
              >
                SUSPENSO
              </span>
            )}
          </div>
          {posStyle && jogador.posicao && (
            <span
              className="font-barlow-condensed text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded"
              style={{
                background: posStyle.bg,
                color: posStyle.color,
                border: `1px solid ${posStyle.color}22`,
              }}
            >
              {jogador.posicao.toUpperCase()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {suspenso ? (
            <button
              onClick={handleReativar}
              disabled={reativando}
              className="font-barlow-condensed text-[13px] tracking-wide px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-[rgba(245,196,0,0.08)]"
              style={{ color: '#f5c400', border: '1px solid #a3840055', background: 'transparent' }}
            >
              {reativando ? 'Reativando...' : 'Reativar'}
            </button>
          ) : (
            <>
              <Link
                href={`/jogadores/${jogador.id}/editar`}
                className="font-barlow-condensed text-[13px] tracking-wide px-3 py-1.5 rounded-lg transition-all hover:bg-[rgba(245,196,0,0.1)] hover:text-gold"
                style={{ color: '#888888', border: '1px solid #242424', background: 'transparent' }}
              >
                Editar
              </Link>

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <button
                      className="font-barlow-condensed text-[13px] tracking-wide px-3 py-1.5 rounded-lg transition-all hover:bg-[rgba(248,113,113,0.08)]"
                      style={{ color: '#f87171', border: 'none', background: 'transparent' }}
                    />
                  }
                >
                  Suspender
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspender jogador?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {jogador.nome} não aparecerá mais na listagem principal nem estará
                      disponível para seleção em novos times. Você pode reativá-lo a qualquer
                      momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSuspender}>Suspender</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
