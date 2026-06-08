'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CicloSchema, type CicloInput, nomeDoCiclo } from '@/lib/validations/ciclo'
import { calcularPeriodoCiclo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cicloId?: number
  defaultValues?: Partial<CicloInput>
}

export function CicloForm({ open, onOpenChange, cicloId, defaultValues }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CicloInput>({
    resolver: zodResolver(CicloSchema),
    defaultValues: defaultValues ?? {},
  })

  const diaDeCorte = watch('diaDeCorte')
  const mesReferencia = watch('mesReferencia')

  let preview: { inicio: string; fim: string; nome: string } | null = null
  if (
    Number.isFinite(diaDeCorte) &&
    diaDeCorte >= 1 &&
    diaDeCorte <= 31 &&
    mesReferencia &&
    /^\d{4}-\d{2}$/.test(mesReferencia)
  ) {
    const [ano, mes] = mesReferencia.split('-').map(Number)
    if (mes >= 1 && mes <= 12) {
      const { inicioEm, fimEm } = calcularPeriodoCiclo(diaDeCorte, mes, ano)
      preview = {
        inicio: inicioEm.toLocaleDateString('pt-BR'),
        fim: fimEm.toLocaleDateString('pt-BR'),
        nome: nomeDoCiclo(inicioEm),
      }
    }
  }

  const onSubmit = async (data: CicloInput) => {
    const url = cicloId ? `/api/ciclos/${cicloId}` : '/api/ciclos'
    const method = cicloId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Erro ao salvar ciclo')
      return
    }

    toast.success(cicloId ? 'Ciclo atualizado' : 'Ciclo criado')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ background: '#111111', border: '1px solid #242424' }}>
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">
            {cicloId ? 'Editar Ciclo' : 'Novo Ciclo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dia de corte *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 15"
                {...register('diaDeCorte', { valueAsNumber: true })}
              />
              {errors.diaDeCorte && (
                <p className="text-sm text-destructive">{errors.diaDeCorte.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Mes / Ano *</Label>
              <Input
                type="month"
                {...register('mesReferencia')}
              />
              {errors.mesReferencia && (
                <p className="text-sm text-destructive">{errors.mesReferencia.message}</p>
              )}
            </div>
          </div>

          {preview && (
            <div
              className="rounded-lg px-4 py-3 space-y-0.5"
              style={{ background: 'rgba(245,196,0,0.06)', border: '1px solid rgba(245,196,0,0.15)' }}
            >
              <p className="font-barlow-condensed text-xs tracking-widest uppercase" style={{ color: '#f5c400' }}>
                {preview.nome}
              </p>
              <p className="font-barlow-condensed text-sm" style={{ color: '#f0ede0' }}>
                {preview.inicio} <span style={{ color: '#555' }}>→</span> {preview.fim}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSubmitting} className="font-barlow-condensed tracking-wide">
              {isSubmitting ? 'Salvando...' : cicloId ? 'Salvar alteracoes' : 'Criar ciclo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="font-barlow-condensed tracking-wide"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
