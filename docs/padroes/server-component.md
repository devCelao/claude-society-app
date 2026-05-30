# Padrao — Server Component (Pagina de Listagem)

## Quando usar

Use este padrao para paginas que exibem dados sem necessidade de interatividade
imediata: listagens, detalhes estaticos, dashboards somente leitura.

## Estrutura

```
src/app/(grupo)/entidade/page.tsx   ← Server Component (sem 'use client')
src/components/entidade/Listagem.tsx ← Client Component (se precisar de interatividade)
```

## Template

```typescript
// src/app/(grupo)/entidade/page.tsx
// SEM 'use client' — este e um Server Component

import { prisma } from '@/lib/db'
import { EntidadeListagem } from '@/components/entidade/EntidadeListagem'

export default async function EntidadePage() {
  const itens = await prisma.entidade.findMany({
    where: { deletedAt: null },  // se aplicavel
    orderBy: { criadoEm: 'desc' },
    include: { /* relacoes necessarias */ },
  })

  return <EntidadeListagem itens={itens} />
}
```

## Regras

1. NUNCA adicionar `'use client'` em `page.tsx` de listagem.
2. NUNCA usar `useEffect` ou `useState` em Server Components.
3. Acessar Prisma DIRETAMENTE — sem fetch para /api/*.
4. Passar dados como props para Client Components filhos.
5. Criar `loading.tsx` na mesma pasta para Suspense automatico.

## Loading State

```typescript
// src/app/(grupo)/entidade/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Carregando...</div>
  // ou Skeleton components do shadcn/ui
}
```
