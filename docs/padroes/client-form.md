# Padrao — Formulario Client-Side

## Quando usar

Use este padrao para formularios de criacao e edicao que submetem dados
via fetch para Route Handlers. Combina react-hook-form + Zod + toast.

## Dependencias

```bash
npm install react-hook-form zod @hookform/resolvers sonner
```

## Template

```typescript
// src/components/entidade/EntidadeForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { EntidadeSchema } from '@/lib/validations/entidade'

type FormData = z.infer<typeof EntidadeSchema>

interface Props {
  defaultValues?: Partial<FormData>
  entidadeId?: number   // se fornecido, usa PATCH; senao usa POST
}

export function EntidadeForm({ defaultValues, entidadeId }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(EntidadeSchema),
    defaultValues,
  })

  const onSubmit = async (data: FormData) => {
    const url = entidadeId ? `/api/entidade/${entidadeId}` : '/api/entidade'
    const method = entidadeId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Erro ao salvar')
      return
    }

    toast.success(entidadeId ? 'Atualizado com sucesso' : 'Criado com sucesso')
    router.push('/entidade')
    router.refresh()  // revalida o Server Component da listagem
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium">Nome</label>
        <input
          id="nome"
          {...register('nome')}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
        {errors.nome && (
          <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

## Schema Zod (em lib/validations/)

```typescript
// src/lib/validations/entidade.ts
import { z } from 'zod'

export const EntidadeSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  // outros campos...
})

export const EntidadeUpdateSchema = EntidadeSchema.partial()
```

## Regras

1. SEMPRE usar `zodResolver` — nunca validar manualmente.
2. SEMPRE exibir erros inline (abaixo do campo) via `errors.campo.message`.
3. SEMPRE desabilitar submit enquanto `isSubmitting === true`.
4. SEMPRE chamar `router.refresh()` apos sucesso para revalidar Server Components.
5. USAR `toast.error` para erros da API e `toast.success` para sucesso.
6. O schema Zod em `lib/validations/` e compartilhado entre o formulario e o Route Handler.
