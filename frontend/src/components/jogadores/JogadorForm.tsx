'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { JogadorSchema, type JogadorInput } from '@/lib/validations/jogador'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  jogadorId?: number
  defaultValues?: Partial<JogadorInput>
}

export function JogadorForm({ jogadorId, defaultValues }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JogadorInput>({
    resolver: zodResolver(JogadorSchema),
    defaultValues: {
      convidado: false,
      ...defaultValues,
    },
  })

  const convidado = watch('convidado')

  const onSubmit = async (data: JogadorInput) => {
    const url = jogadorId ? `/api/jogadores/${jogadorId}` : '/api/jogadores'
    const method = jogadorId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Erro ao salvar jogador')
      return
    }

    toast.success(jogadorId ? 'Jogador atualizado' : 'Jogador cadastrado')
    router.push('/jogadores')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome completo" />
        {errors.nome && (
          <p className="text-sm text-destructive">{errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="apelido">Apelido</Label>
        <Input id="apelido" {...register('apelido')} placeholder="Opcional" />
        {errors.apelido && (
          <p className="text-sm text-destructive">{errors.apelido.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="posicao">Posicao</Label>
        <Input id="posicao" {...register('posicao')} placeholder="Ex: goleiro, atacante" />
        {errors.posicao && (
          <p className="text-sm text-destructive">{errors.posicao.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="convidado"
          checked={convidado}
          onCheckedChange={(val) => setValue('convidado', Boolean(val))}
        />
        <Label htmlFor="convidado">Jogador convidado</Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : jogadorId ? 'Salvar alteracoes' : 'Cadastrar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/jogadores')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
