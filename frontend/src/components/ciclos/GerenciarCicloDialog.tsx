'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type CicloResumo = { id: number; nome: string; inicioEm: string; fimEm: string | null }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cicloAtual: CicloResumo
  todosOsCiclos: CicloResumo[]
}

type Etapa = 'menu' | 'confirmar_exclusao' | 'transferir'

export function GerenciarCicloDialog({ open, onOpenChange, cicloAtual, todosOsCiclos }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('menu')
  const [destinoCicloId, setDestinoCicloId] = useState<number | ''>('')
  const [salvando, setSalvando] = useState(false)

  const eAtivo = cicloAtual.fimEm === null
  const ciclosDestino = todosOsCiclos.filter((c) => c.id !== cicloAtual.id)

  function handleClose() {
    setEtapa('menu')
    setDestinoCicloId('')
    onOpenChange(false)
  }

  async function handleExcluir(destinoId?: number) {
    setSalvando(true)
    try {
      const body = destinoId ? JSON.stringify({ destinoCicloId: destinoId }) : undefined
      const res = await fetch(`/api/ciclos/${cicloAtual.id}`, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'ciclo_tem_jogos') {
          setEtapa('transferir')
          return
        }
        toast.error(data.error ?? 'Erro ao excluir ciclo')
        return
      }

      toast.success('Ciclo excluido com sucesso')
      handleClose()
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function handleTransferir() {
    if (!destinoCicloId) return
    await handleExcluir(Number(destinoCicloId))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" style={{ background: '#111111', border: '1px solid #242424' }}>
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">
            Gerenciar ciclo
          </DialogTitle>
        </DialogHeader>

        <div className="pt-1">
          {/* Nome do ciclo selecionado */}
          <p className="font-barlow-condensed text-sm text-muted-foreground mb-4">
            Ciclo selecionado:{' '}
            <span style={{ color: '#f5c400' }} className="font-semibold">
              {cicloAtual.nome}
            </span>
            {eAtivo && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                ativo
              </span>
            )}
          </p>

          {/* MENU PRINCIPAL */}
          {etapa === 'menu' && (
            <div className="space-y-3">
              <button
                onClick={() => setEtapa('confirmar_exclusao')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors font-barlow-condensed text-sm tracking-wide"
                style={{ background: '#1a0606', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#220a0a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1a0606')}
              >
                <Trash2 size={16} />
                {eAtivo ? 'Cancelar ciclo ativo' : 'Excluir ciclo'}
              </button>

              <p className="text-xs text-muted-foreground font-barlow-condensed px-1">
                {eAtivo
                  ? 'Cancela este ciclo. Se houver dias de jogo vinculados, será necessário transferi-los para outro ciclo antes.'
                  : 'Remove o ciclo permanentemente. Só disponível se não houver dias de jogo vinculados.'}
              </p>
            </div>
          )}

          {/* CONFIRMAR EXCLUSÃO */}
          {etapa === 'confirmar_exclusao' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#1a0e00', border: '1px solid rgba(251,146,60,0.2)' }}>
                <AlertTriangle size={16} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm font-barlow-condensed tracking-wide" style={{ color: '#fb923c' }}>
                  {eAtivo
                    ? 'O ciclo será cancelado. Se havia um ciclo anterior encerrado, ele será reaberto automaticamente como ativo.'
                    : 'O ciclo será excluído permanentemente.'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => handleExcluir()}
                  disabled={salvando}
                  className="font-barlow-condensed tracking-wide"
                  style={{ background: '#f87171', color: '#000' }}
                >
                  {salvando ? 'Excluindo...' : 'Confirmar exclusão'}
                </Button>
                <Button variant="outline" onClick={() => setEtapa('menu')} disabled={salvando} className="font-barlow-condensed">
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* TRANSFERIR JOGOS */}
          {etapa === 'transferir' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#1a0e00', border: '1px solid rgba(251,146,60,0.2)' }}>
                <ArrowRightLeft size={16} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm font-barlow-condensed tracking-wide" style={{ color: '#fb923c' }}>
                  Este ciclo possui dias de jogo. Selecione o ciclo destino para transferi-los antes de cancelar.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-barlow-condensed text-muted-foreground tracking-wide">
                  Ciclo destino *
                </label>
                {ciclosDestino.length === 0 ? (
                  <p className="text-sm font-barlow-condensed" style={{ color: '#f87171' }}>
                    Nenhum outro ciclo disponível. Crie um ciclo destino primeiro.
                  </p>
                ) : (
                  <select
                    value={destinoCicloId}
                    onChange={(e) => setDestinoCicloId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl px-3.5 py-2.5 font-barlow-condensed text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20"
                    style={{ background: '#0a0a0a', border: '1px solid #242424' }}
                  >
                    <option value="">Selecione o ciclo destino...</option>
                    {ciclosDestino.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.fimEm === null ? '(ativo)' : '(encerrado)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleTransferir}
                  disabled={salvando || !destinoCicloId || ciclosDestino.length === 0}
                  className="font-barlow-condensed tracking-wide"
                  style={{ background: '#f5c400', color: '#000' }}
                >
                  {salvando ? 'Transferindo...' : 'Transferir e cancelar'}
                </Button>
                <Button variant="outline" onClick={() => setEtapa('menu')} disabled={salvando} className="font-barlow-condensed">
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
