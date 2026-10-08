'use client'

import type { Jogador, PosicaoResumo } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { JogadorForm } from './JogadorForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  posicoes: PosicaoResumo[]
  onCriado: (jogador: Jogador) => void
}

export function NovoJogadorDialog({ open, onOpenChange, posicoes, onCriado }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Mobile: limita a altura para o teclado virtual nao esconder os botoes
        className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto"
        style={{ background: '#111111', border: '1px solid #242424' }}
      >
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">Novo Jogador</DialogTitle>
        </DialogHeader>
        {open && (
          <JogadorForm
            posicoes={posicoes}
            onSuccess={(jogador) => {
              onCriado(jogador)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
