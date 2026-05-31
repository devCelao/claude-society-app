# ET Frontend — jogadores
**Versao:** 1.1
**Data:** 2026-05-30
**Agente:** agente-analista-frontend
**EFS de referencia:** `docs/features/jogadores/efs.md` v1.2
**Status:** Aprovada (GATE 2A)

---

## Resumo

Implementacao do modulo de jogadores: listagem SSR com toggle "Mostrar suspensos",
cadastro, edicao e suspensao (soft delete via `deletedAt`). Inclui reativacao
de jogador suspenso diretamente pela listagem.

Padroes utilizados: `server-component.md`, `client-form.md`, `route-handler.md`.

---

## Padroes Verificados

| Padrao | Arquivo | Aplicavel |
|--------|---------|-----------|
| Server Component | `docs/padroes/server-component.md` | Sim — pagina de listagem |
| Client Form | `docs/padroes/client-form.md` | Sim — formularios de criar/editar |
| Route Handler | `docs/padroes/route-handler.md` | Sim — endpoints GET, POST, PATCH, DELETE |
| Partida ao Vivo | `docs/padroes/partida-ao-vivo.md` | Nao aplicavel |

Nenhum bloqueio de arquitetura identificado.

---

## Artefatos a Criar

### 1. Validacao Zod

**Arquivo:** `src/lib/validations/jogador.ts`

```typescript
import { z } from 'zod'

export const JogadorSchema = z.object({
  nome: z
    .string({ required_error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  apelido: z
    .string()
    .max(50, 'Apelido deve ter no maximo 50 caracteres')
    .optional()
    .nullable(),
  posicao: z
    .string()
    .max(30, 'Posicao deve ter no maximo 30 caracteres')
    .optional()
    .nullable(),
  convidado: z.boolean().default(false),
})

export const JogadorUpdateSchema = JogadorSchema.partial()

// Usado somente pelo Route Handler de reativacao
export const JogadorReativarSchema = z.object({
  deletedAt: z.null(),
})

export type JogadorInput = z.infer<typeof JogadorSchema>
export type JogadorUpdateInput = z.infer<typeof JogadorUpdateSchema>
```

---

### 2. Tipos

**Arquivo:** `src/types/index.ts`
Adicionar (ou garantir que existe) re-export do tipo Prisma:

```typescript
export type { Jogador } from '@/generated/prisma/client'
```

Nao importar `Jogador` diretamente de `@/generated/prisma/client` fora deste arquivo.

---

### 3. Route Handlers

#### 3.1 GET + POST — `/api/jogadores`

**Arquivo:** `src/app/api/jogadores/route.ts`

**GET `/api/jogadores`**
- Query param opcional: `?incluirSuspensos=true`
- Sem o param: retorna somente jogadores com `deletedAt = null`
- Com o param: retorna todos, suspensos ao final (ordenados por nome dentro de cada grupo)
- Ordenacao: `orderBy: { nome: 'asc' }`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JogadorSchema } from '@/lib/validations/jogador'

export async function GET(req: NextRequest) {
  try {
    const incluirSuspensos = req.nextUrl.searchParams.get('incluirSuspensos') === 'true'

    const jogadores = await prisma.jogador.findMany({
      where: incluirSuspensos ? {} : { deletedAt: null },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(jogadores)
  } catch (error) {
    console.error('[GET /api/jogadores]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

**POST `/api/jogadores`**
- Valida com `JogadorSchema`
- Retorna 201 com o jogador criado
- Retorna 422 se dados invalidos

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = JogadorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const jogador = await prisma.jogador.create({ data: parsed.data })
    return NextResponse.json(jogador, { status: 201 })
  } catch (error) {
    console.error('[POST /api/jogadores]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

#### 3.2 GET + PATCH + DELETE — `/api/jogadores/[id]`

**Arquivo:** `src/app/api/jogadores/[id]/route.ts`

**GET `/api/jogadores/[id]`**
- Retorna jogador por ID (incluindo suspensos)
- 404 se nao encontrado

**PATCH `/api/jogadores/[id]`**
- Dois usos distintos, diferenciados pelo corpo:
  1. **Edicao de dados:** valida com `JogadorUpdateSchema`; atualiza nome/apelido/posicao/convidado
  2. **Reativacao:** corpo `{ "deletedAt": null }`; valida que jogador esta suspenso antes de reativar
- Retorna 400 com mensagem "Jogador ja esta ativo" se tentar reativar jogador ja ativo
- Retorna 404 se jogador nao encontrado

**DELETE `/api/jogadores/[id]`**
- Soft delete: seta `deletedAt: new Date()`
- Retorna 204 sem corpo
- 404 se nao encontrado

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JogadorUpdateSchema } from '@/lib/validations/jogador'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }
    return NextResponse.json(jogador)
  } catch (error) {
    console.error('[GET /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()

    // Caso de reativacao: corpo contem deletedAt: null
    if ('deletedAt' in body && body.deletedAt === null) {
      const jogador = await prisma.jogador.findUnique({ where: { id } })
      if (!jogador) {
        return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
      }
      if (jogador.deletedAt === null) {
        return NextResponse.json({ error: 'Jogador ja esta ativo' }, { status: 400 })
      }
      const reativado = await prisma.jogador.update({
        where: { id },
        data: { deletedAt: null },
      })
      return NextResponse.json(reativado)
    }

    // Caso de edicao de dados
    const parsed = JogadorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.jogador.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('[PATCH /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }
    await prisma.jogador.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

### 4. Paginas

#### 4.1 Listagem

**Arquivo:** `src/app/(jogadores)/jogadores/page.tsx`

Server Component. Busca apenas jogadores ativos via Prisma (sem fetch para API).
Passa a lista para o Client Component `JogadorListagem`, que gerencia o toggle de suspensos.

```typescript
// SEM 'use client'
import { prisma } from '@/lib/db'
import { JogadorListagem } from '@/components/jogadores/JogadorListagem'

export const metadata = { title: 'Jogadores' }

export default async function JogadoresPage() {
  const jogadores = await prisma.jogador.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
  })
  return <JogadorListagem jogadoresIniciais={jogadores} />
}
```

**Arquivo:** `src/app/(jogadores)/jogadores/loading.tsx`

```typescript
export default function Loading() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  )
}
```

---

#### 4.2 Novo Jogador

**Arquivo:** `src/app/(jogadores)/jogadores/novo/page.tsx`

Server Component que apenas renderiza o formulario (Client Component).

```typescript
// SEM 'use client'
import { JogadorForm } from '@/components/jogadores/JogadorForm'

export const metadata = { title: 'Novo Jogador' }

export default function NovoJogadorPage() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Novo Jogador</h1>
      <JogadorForm />
    </div>
  )
}
```

---

#### 4.3 Editar Jogador

**Arquivo:** `src/app/(jogadores)/jogadores/[id]/editar/page.tsx`

Server Component. Busca o jogador pelo ID via Prisma. Se nao encontrado, redireciona
para a listagem.

```typescript
// SEM 'use client'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { JogadorForm } from '@/components/jogadores/JogadorForm'

export const metadata = { title: 'Editar Jogador' }

interface Props {
  params: { id: string }
}

export default async function EditarJogadorPage({ params }: Props) {
  const id = parseInt(params.id)
  const jogador = await prisma.jogador.findUnique({ where: { id } })

  if (!jogador) notFound()

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Editar Jogador</h1>
      <JogadorForm
        jogadorId={jogador.id}
        defaultValues={{
          nome: jogador.nome,
          apelido: jogador.apelido ?? undefined,
          posicao: jogador.posicao ?? undefined,
          convidado: jogador.convidado,
        }}
      />
    </div>
  )
}
```

---

### 5. Componentes

#### 5.1 JogadorListagem

**Arquivo:** `src/components/jogadores/JogadorListagem.tsx`

Client Component. Recebe `jogadoresIniciais` (apenas ativos) como prop.
Gerencia o toggle "Mostrar suspensos" em estado local. Quando ativado,
faz fetch para `/api/jogadores?incluirSuspensos=true` e exibe suspensos
ao final da lista com visual diferenciado.

Estado do toggle nao persiste entre sessoes (estado local via `useState`).

```typescript
'use client'

import { useState } from 'react'
import { Jogador } from '@/types'
import { JogadorCard } from './JogadorCard'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  jogadoresIniciais: Jogador[]
}

export function JogadorListagem({ jogadoresIniciais }: Props) {
  const [mostrarSuspensos, setMostrarSuspensos] = useState(false)
  const [suspensos, setSuspensos] = useState<Jogador[]>([])
  const [carregandoSuspensos, setCarregandoSuspensos] = useState(false)

  async function handleToggle(valor: boolean) {
    setMostrarSuspensos(valor)
    if (valor && suspensos.length === 0) {
      setCarregandoSuspensos(true)
      try {
        const res = await fetch('/api/jogadores?incluirSuspensos=true')
        const todos: Jogador[] = await res.json()
        setSuspensos(todos.filter((j) => j.deletedAt !== null))
      } finally {
        setCarregandoSuspensos(false)
      }
    }
  }

  // Atualiza a lista de suspensos apos reativacao
  function onReativar(id: number) {
    setSuspensos((prev) => prev.filter((j) => j.id !== id))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jogadores</h1>
        <Button asChild size="sm">
          <Link href="/jogadores/novo">Novo Jogador</Link>
        </Button>
      </div>

      {jogadoresIniciais.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhum jogador cadastrado.</p>
      )}

      <div className="space-y-2">
        {jogadoresIniciais.map((jogador) => (
          <JogadorCard key={jogador.id} jogador={jogador} />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Switch
          id="toggle-suspensos"
          checked={mostrarSuspensos}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="toggle-suspensos">Mostrar suspensos</Label>
      </div>

      {mostrarSuspensos && (
        <div className="space-y-2">
          {carregandoSuspensos && (
            <div className="h-12 rounded-lg bg-muted animate-pulse" />
          )}
          {!carregandoSuspensos && suspensos.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum jogador suspenso.</p>
          )}
          {suspensos.map((jogador) => (
            <JogadorCard
              key={jogador.id}
              jogador={jogador}
              suspenso
              onReativar={onReativar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

#### 5.2 JogadorCard

**Arquivo:** `src/components/jogadores/JogadorCard.tsx`

Client Component. Exibe dados do jogador. Possui dois modos:
- **Ativo:** badge "Convidado" (se aplicavel), botoes "Editar" e "Suspender"
- **Suspenso:** card acinzentado, badge "Suspenso", botao "Reativar"

Confirmacao de suspensao: dialog simples do shadcn/ui para evitar clique acidental.
Reativacao: sem dialog (acao facilmente reversivel, conforme EFS).

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Jogador } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface Props {
  jogador: Jogador
  suspenso?: boolean
  onReativar?: (id: number) => void
}

export function JogadorCard({ jogador, suspenso = false, onReativar }: Props) {
  const router = useRouter()
  const [reativando, setReativando] = useState(false)

  async function handleSuspender() {
    const res = await fetch(`/api/jogadores/${jogador.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao suspender jogador')
      return
    }
    toast.success('Jogador suspenso')
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
    } finally {
      setReativando(false)
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        suspenso ? 'opacity-50 bg-muted' : 'bg-card'
      }`}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{jogador.nome}</span>
          {jogador.apelido && (
            <span className="text-sm text-muted-foreground">({jogador.apelido})</span>
          )}
          {jogador.convidado && (
            <Badge variant="secondary">Convidado</Badge>
          )}
          {suspenso && (
            <Badge variant="outline">Suspenso</Badge>
          )}
        </div>
        {jogador.posicao && (
          <p className="text-xs text-muted-foreground">{jogador.posicao}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {suspenso ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReativar}
            disabled={reativando}
          >
            {reativando ? 'Reativando...' : 'Reativar'}
          </Button>
        ) : (
          <>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/jogadores/${jogador.id}/editar`}>Editar</Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">Suspender</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspender jogador?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {jogador.nome} nao aparecera mais na listagem principal
                    nem estara disponivel para selecao em novos times.
                    Voce pode reativa-lo a qualquer momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSuspender}>
                    Suspender
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}
```

---

#### 5.3 JogadorForm

**Arquivo:** `src/components/jogadores/JogadorForm.tsx`

Client Component. Usado tanto para criacao quanto para edicao.
- Se `jogadorId` nao fornecido: POST para `/api/jogadores`
- Se `jogadorId` fornecido: PATCH para `/api/jogadores/[id]`
- Apos sucesso: redirect para `/jogadores` + `router.refresh()`

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { JogadorSchema, type JogadorInput } from '@/lib/validations/jogador'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

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
        <Switch
          id="convidado"
          checked={convidado}
          onCheckedChange={(val) => setValue('convidado', val)}
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
```

---

## Componentes shadcn/ui Necessarios

Os componentes abaixo precisam estar instalados antes da implementacao:

| Componente | Comando de instalacao |
|------------|----------------------|
| `Button` | `npx shadcn-ui@latest add button` |
| `Input` | `npx shadcn-ui@latest add input` |
| `Label` | `npx shadcn-ui@latest add label` |
| `Badge` | `npx shadcn-ui@latest add badge` |
| `Switch` | `npx shadcn-ui@latest add switch` |
| `AlertDialog` | `npx shadcn-ui@latest add alert-dialog` |

---

## Criterios de Aceite Tecnicos

| CA da EFS | Como verificar |
|-----------|---------------|
| CA-01 | GET `/api/jogadores` sem param retorna somente `deletedAt: null` |
| CA-02 | JogadorCard exibe Badge "Convidado" para `convidado: true` |
| CA-03 | POST `/api/jogadores` com nome valido retorna 201; jogador aparece na listagem |
| CA-04 | Submissao com nome vazio — formulario exibe erro inline, nao faz fetch |
| CA-05 | PATCH `/api/jogadores/[id]` com dados validos retorna 200; listagem reflete |
| CA-06 | DELETE `/api/jogadores/[id]` retorna 204; jogador some da listagem (router.refresh) |
| CA-07 | Toggle desativado: jogador suspenso nao aparece na listagem |
| CA-08 | Fetch com erro: toast de erro exibido, formulario mantem dados |
| CA-09 | Toggle ativado: GET com `?incluirSuspensos=true`; suspensos exibidos com badge |
| CA-10 | PATCH `{ deletedAt: null }` reativa jogador; card some da lista de suspensos |
| CA-11 | Toggle desativado apos ativado: lista de suspensos some da tela |

---

## Restricoes e Observacoes

1. **Sem paginacao:** grupo de ~18 pessoas; cabe em uma tela (conforme EFS).
2. **Toggle nao persiste:** `useState` local, sem `localStorage` ou cookie.
3. **Suspensao com dialog:** AlertDialog do shadcn/ui para evitar clique acidental.
4. **Reativacao sem dialog:** acao reversivel, sem confirmacao adicional (conforme EFS).
5. **Jogadores suspensos em selecao de time:** filtro `deletedAt: null` e responsabilidade
   do modulo dias-de-jogo; esta ET apenas define a regra de negocio (RN-09).
6. **`router.refresh()` apos mutacoes:** obrigatorio para revalidar o Server Component
   da listagem sem reload completo de pagina.
7. **`notFound()`** na pagina de edicao: se o ID nao existe, Next.js exibe a pagina
   de not-found padrao (sem redirect manual).

---

## Historico de Versoes

| Versao | Data | Alteracao |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Versao inicial — cobertura completa da EFS v1.2 |
| 1.1 | 2026-05-30 | Correcao: import em src/types/index.ts alterado de @prisma/client para @/generated/prisma/client; GATE 2A aprovado |
