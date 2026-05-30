# Padrao — Route Handler (API Route)

## Quando usar

Use este padrao para endpoints que recebem mutacoes do cliente (POST, PATCH, DELETE)
ou que precisam ser chamados via fetch client-side (cronometro, marcacao de gol).

## Estrutura de arquivo

```
src/app/api/entidade/route.ts         ← GET (lista) e POST
src/app/api/entidade/[id]/route.ts    ← GET (detalhe), PATCH, DELETE
```

## Template — POST (criacao)

```typescript
// src/app/api/entidade/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EntidadeSchema } from '@/lib/validations/entidade'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = EntidadeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const item = await prisma.entidade.create({ data: parsed.data })
    return NextResponse.json(item, { status: 201 })

  } catch (error) {
    console.error('[POST /api/entidade]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

## Template — PATCH (atualizacao parcial)

```typescript
// src/app/api/entidade/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EntidadeUpdateSchema } from '@/lib/validations/entidade'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const parsed = EntidadeUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const item = await prisma.entidade.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(item)

  } catch (error) {
    console.error('[PATCH /api/entidade/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

## Template — DELETE (soft delete)

```typescript
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    await prisma.entidade.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/entidade/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

## Codigos de Status

| Situacao | Status |
|----------|--------|
| Sucesso com corpo | 200 |
| Criado | 201 |
| Sem corpo (DELETE) | 204 |
| Dados invalidos (Zod) | 422 |
| Regra de negocio violada | 400 |
| Nao encontrado | 404 |
| Erro interno | 500 |

## Regras

1. SEMPRE validar entrada com Zod antes de tocar no banco.
2. SEMPRE envolver em try/catch — nunca deixar excecao vazar.
3. NUNCA retornar stack trace para o cliente — apenas em logs do servidor.
4. Retornar mensagens de erro em portugues (app em pt-BR).
5. Verificar regras de negocio ANTES da query de escrita (ex: max 2 gols por time).
