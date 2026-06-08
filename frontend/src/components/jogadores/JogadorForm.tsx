'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { JogadorSchema, POSICOES_JOGADOR, type JogadorInput, type PosicaoJogadorValue } from '@/lib/validations/jogador'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const POSICAO_LABELS: Record<PosicaoJogadorValue, string> = {
  GOLEIRO: 'Goleiro',
  ZAGUEIRO: 'Zagueiro',
  LATERAL: 'Lateral',
  VOLANTE: 'Volante',
  MEIA: 'Meia',
  ATACANTE: 'Atacante',
  PONTA: 'Ponta',
}

interface Props {
  jogadorId?: number
  defaultValues?: Partial<JogadorInput>
}

export function JogadorForm({ jogadorId, defaultValues }: Props) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JogadorInput>({
    resolver: zodResolver(JogadorSchema),
    defaultValues: {
      convidado: false,
      ...defaultValues,
    },
  })

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Posicao primaria</Label>
          <Controller
            control={control}
            name="posicaoPrimaria"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(val) => field.onChange(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {POSICOES_JOGADOR.map((p) => (
                    <SelectItem key={p} value={p}>
                      {POSICAO_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.posicaoPrimaria && (
            <p className="text-sm text-destructive">{errors.posicaoPrimaria.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Posicao secundaria</Label>
          <Controller
            control={control}
            name="posicaoSecundaria"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(val) => field.onChange(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {POSICOES_JOGADOR.map((p) => (
                    <SelectItem key={p} value={p}>
                      {POSICAO_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.posicaoSecundaria && (
            <p className="text-sm text-destructive">{errors.posicaoSecundaria.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-center items-center gap-3">
        <Controller
          control={control}
          name="convidado"
          render={({ field }) => (
            <Checkbox
              id="convidado"
              checked={field.value}
              onCheckedChange={(val) => field.onChange(Boolean(val))}
            />
          )}
        />
        <Label htmlFor="convidado">Jogador convidado</Label>
      </div>

      <div className="flex justify-center gap-2 pt-2">
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
