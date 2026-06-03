'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CicloSchema, type CicloInput, nomeDoCiclo } from '@/lib/validations/ciclo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DatePickerField } from '@/components/ui/date-picker-field'
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
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CicloInput>({
    resolver: zodResolver(CicloSchema),
    defaultValues: defaultValues ?? {},
  })

  const inicioEm = watch('inicioEm') ?? ''
  const fimEm = watch('fimEm') ?? ''
  const nomePreview = inicioEm ? nomeDoCiclo(inicioEm) : null

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
          <div className="space-y-1.5">
            <Label>Data de inicio *</Label>
            <DatePickerField
              value={inicioEm}
              onChange={(v) => setValue('inicioEm', v, { shouldValidate: true })}
              placeholder="Selecione a data de inicio"
            />
            {errors.inicioEm && (
              <p className="text-sm text-destructive">{errors.inicioEm.message}</p>
            )}
            {nomePreview && (
              <p className="text-xs font-barlow-condensed tracking-wide" style={{ color: '#f5c400' }}>
                Este ciclo sera chamado: <strong>{nomePreview}</strong>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Data de encerramento</Label>
            <DatePickerField
              value={fimEm}
              onChange={(v) => setValue('fimEm', v, { shouldValidate: true })}
              placeholder="Deixe vazio para ciclo ativo"
            />
            <p className="text-xs text-muted-foreground font-barlow-condensed">
              Deixe em branco para manter o ciclo ativo indefinidamente
            </p>
            {errors.fimEm && (
              <p className="text-sm text-destructive">{errors.fimEm?.message as string}</p>
            )}
          </div>

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
