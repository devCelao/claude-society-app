'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LoginSchema = z.object({
  username: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

type LoginData = z.infer<typeof LoginSchema>

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(LoginSchema) })

  async function onSubmit(data: LoginData) {
    setError(null)
    const result = await signIn('credentials', {
      username: data.username,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError('Usuário ou senha inválidos')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="username" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
          Usuário
        </Label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          {...register('username')}
          style={{ background: '#111', borderColor: '#242424', color: '#f0ede0' }}
        />
        {errors.username && (
          <p className="font-barlow-condensed text-xs text-red-400">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="font-barlow-condensed text-sm tracking-wide text-muted-foreground">
          Senha
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          style={{ background: '#111', borderColor: '#242424', color: '#f0ede0' }}
        />
        {errors.password && (
          <p className="font-barlow-condensed text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <p className="font-barlow-condensed text-sm text-red-400 text-center">{error}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full font-barlow-condensed tracking-widest"
        style={{ background: '#f5c400', color: '#0a0a0a' }}
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'ENTRAR'}
      </Button>
    </form>
  )
}
