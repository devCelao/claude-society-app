'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PerfilSchema, type PerfilData } from '@/lib/validations/perfil'

const inputStyle = { background: '#111', borderColor: '#242424', color: '#f0ede0' }

export function PerfilForm({ nome }: { nome: string }) {
  const router = useRouter()
  const [alterarSenha, setAlterarSenha] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilData>({
    resolver: zodResolver(PerfilSchema),
    defaultValues: { name: nome },
  })

  async function onSubmit(data: PerfilData) {
    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      const msg = typeof body.error === 'string' ? body.error : 'Erro ao salvar'
      toast.error(msg)
      return
    }

    toast.success('Perfil atualizado')
    setAlterarSenha(false)
    reset({ name: data.name, senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
          Nome
        </Label>
        <Input id="name" {...register('name')} style={inputStyle} />
        {errors.name && (
          <p className="font-barlow-condensed text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senhaAtual" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
          Senha atual
        </Label>
        <Input id="senhaAtual" type="password" autoComplete="current-password" {...register('senhaAtual')} style={inputStyle} />
        {errors.senhaAtual && (
          <p className="font-barlow-condensed text-xs text-red-400">{errors.senhaAtual.message}</p>
        )}
      </div>

      {!alterarSenha ? (
        <button
          type="button"
          onClick={() => setAlterarSenha(true)}
          className="font-barlow-condensed text-sm tracking-wide"
          style={{ color: '#f5c400' }}
        >
          Alterar senha
        </button>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="novaSenha" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
              Nova senha
            </Label>
            <Input id="novaSenha" type="password" autoComplete="new-password" {...register('novaSenha')} style={inputStyle} />
            {errors.novaSenha && (
              <p className="font-barlow-condensed text-xs text-red-400">{errors.novaSenha.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmarSenha" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
              Confirmar nova senha
            </Label>
            <Input id="confirmarSenha" type="password" autoComplete="new-password" {...register('confirmarSenha')} style={inputStyle} />
            {errors.confirmarSenha && (
              <p className="font-barlow-condensed text-xs text-red-400">{errors.confirmarSenha.message}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAlterarSenha(false)}
            className="font-barlow-condensed text-sm tracking-wide"
            style={{ color: '#555' }}
          >
            Cancelar alteração de senha
          </button>
        </>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full font-barlow-condensed tracking-widest"
        style={{ background: '#f5c400', color: '#0a0a0a' }}
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'SALVAR'}
      </Button>
    </form>
  )
}
