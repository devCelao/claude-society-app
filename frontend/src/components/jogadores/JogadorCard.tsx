'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, UserX, UserCheck } from 'lucide-react'
import { JogadorComPosicoes } from '@/types'
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
  jogador: JogadorComPosicoes
  suspenso?: boolean
  onReativar?: (id: number) => void
  onSuspender?: () => void
  animDelay?: number
}

export function JogadorCard({ jogador, suspenso = false, onReativar, onSuspender, animDelay = 0 }: Props) {
  const router = useRouter()
  const [reativando, setReativando] = useState(false)
  const [hovered, setHovered] = useState(false)

  const avatar = AVATAR_PALETTE[jogador.id % AVATAR_PALETTE.length]
  const posEstilo = jogador.posicaoPrimaria
  const posSecEstilo = jogador.posicaoSecundaria
  const temLinha2 = jogador.apelido || posEstilo || posSecEstilo || jogador.convidado || suspenso

  async function handleSuspender() {
    const res = await fetch(`/api/jogadores/${jogador.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao suspender jogador')
      return
    }
    toast.success('Jogador suspenso')
    onSuspender?.()
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
      router.refresh()
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
        className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5 transition-all"
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
        {/* Linha 1: avatar + nome + ícones de ação */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bebas text-sm tracking-wide"
            style={{
              background: avatar.bg,
              color: avatar.color,
              border: `1.5px solid ${avatar.color}28`,
            }}
          >
            {initials(jogador.nome)}
          </div>

          <span
            className="flex-1 min-w-0 text-[15px] font-semibold font-barlow leading-tight truncate"
            style={{ color: suspenso ? '#555555' : '#f0ede0' }}
          >
            {jogador.nome}
          </span>

          {/* Ícones de ação */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {suspenso ? (
              <button
                onClick={handleReativar}
                disabled={reativando}
                title="Reativar jogador"
                className="p-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-[rgba(245,196,0,0.08)]"
                style={{ color: '#f5c400' }}
              >
                <UserCheck size={15} />
              </button>
            ) : (
              <>
                <Link
                  href={`/jogadores/${jogador.id}/editar`}
                  title="Editar jogador"
                  className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
                  style={{ color: '#666666' }}
                >
                  <Pencil size={14} />
                </Link>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        title="Suspender jogador"
                        className="p-1.5 rounded-lg transition-all hover:bg-[rgba(248,113,113,0.08)]"
                        style={{ color: '#f87171' }}
                      />
                    }
                  >
                    <UserX size={14} />
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

        {/* Linha 2: apelido + badges (posições + visitante + suspenso), todos à direita */}
        {temLinha2 && (
          <div className="flex items-center justify-end gap-1.5 flex-wrap pl-[46px]">
            {jogador.apelido && (
              <span className="text-[12px] text-muted-foreground font-barlow-condensed mr-auto">
                ({jogador.apelido})
              </span>
            )}
            {posEstilo && (
              <span
                className="font-barlow-condensed text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded"
                style={{
                  background: `${posEstilo.cor}14`,
                  color: posEstilo.cor,
                  border: `1px solid ${posEstilo.cor}22`,
                }}
                title={posEstilo.nome}
              >
                {posEstilo.sigla}
              </span>
            )}
            {posSecEstilo && (
              <span
                className="font-barlow-condensed text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded opacity-70"
                style={{
                  background: `${posSecEstilo.cor}10`,
                  color: posSecEstilo.cor,
                  border: `1px solid ${posSecEstilo.cor}18`,
                }}
                title={posSecEstilo.nome}
              >
                {posSecEstilo.sigla}
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
        )}
      </div>
    </div>
  )
}
