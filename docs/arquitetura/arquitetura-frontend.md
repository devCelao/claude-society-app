# Arquitetura Frontend — claude-society-app
**Versao:** 1
**Data:** 2026-05-29
**Tipo:** Implementacao nova (imp)
**Stack:** Next.js 14 App Router + TypeScript + Prisma
**Status:** Proposta

---

## Contexto

Monolito fullstack: frontend e backend no mesmo processo Next.js.
Nao ha servico de API separado. Server Components acessam o Prisma Client
diretamente. Route Handlers expõem endpoints REST para operacoes interativas
(cronometro, marcacao de gols) que precisam de fetch client-side.

Autenticacao gerenciada pelo Traefik (Basic Auth na borda). O app nao
implementa sessao, cookies de auth nem middleware de protecao de rota.

---

## Decisoes de Arquitetura

| Decisao | Escolha | Justificativa |
|---------|---------|---------------|
| Roteamento | App Router (Next.js 14) | Layouts aninhados, Server Components por padrao, melhor para SSR |
| Acesso a dados (paginas) | Server Components com Prisma direto | Evita roundtrip HTTP desnecessario; dados chegam no HTML inicial |
| Acesso a dados (interativo) | fetch para Route Handlers (`/api/*`) | Cronometro e marcacao de gol requerem atualizacoes sem reload |
| Estado client-side | useState / useReducer + SWR para revalidacao | Minimo de estado global; sem Redux/Zustand |
| Validacao de entrada | Zod (compartilhado entre client e Route Handler) | Single source of truth para schemas |
| Estilos | Tailwind CSS | Utilidade, sem CSS-in-JS, compativel com SSR |
| Componentes UI | shadcn/ui (base Radix UI) | Acessivel, sem runtime, customizavel |
| Icones | lucide-react | Consistente com shadcn/ui |
| Cronometro | setInterval client-side + persistencia no banco ao iniciar | Estado visivel no cliente; banco como fonte de verdade para inicio |
| Responsividade | Mobile-first | App usado no celular durante partidas |

---

## Estrutura de Pastas

```
src/
  app/
    layout.tsx                    # Layout raiz (fonte, tema, toaster)
    page.tsx                      # Redirect para /dashboard
    
    (dashboard)/
      layout.tsx                  # Layout do dashboard (nav lateral)
      dashboard/
        page.tsx                  # Dashboard principal — SSR
        loading.tsx
      
    (jogadores)/
      jogadores/
        page.tsx                  # Lista de jogadores — SSR
        novo/
          page.tsx                # Formulario de novo jogador
        [id]/
          editar/
            page.tsx              # Formulario de edicao
      
    (ciclos)/
      ciclos/
        page.tsx                  # Lista de ciclos
        novo/
          page.tsx
        [id]/
          page.tsx                # Detalhe do ciclo
      
    (game-day)/
      dias-de-jogo/
        page.tsx                  # Lista de dias de jogo
        novo/
          page.tsx
        [id]/
          page.tsx                # Visao geral do dia (times, partidas)
          montar-times/
            page.tsx              # Interface de montagem dos 3 times
          partidas/
            [partidaId]/
              page.tsx            # Tela ao vivo da partida (cronometro + gols)
    
    api/
      health/
        route.ts                  # GET /api/health
      jogadores/
        route.ts                  # GET (lista) / POST
        [id]/
          route.ts                # GET / PATCH / DELETE (soft)
      ciclos/
        route.ts                  # GET / POST
        [id]/
          route.ts                # GET / PATCH
      dias-de-jogo/
        route.ts                  # GET / POST
        [id]/
          route.ts                # GET / PATCH
          times/
            route.ts              # POST (montar times) / GET
          partidas/
            route.ts              # POST (nova partida)
            [partidaId]/
              route.ts            # GET / PATCH (finalizar, editar)
              gols/
                route.ts          # POST (marcar gol)
                [golId]/
                  route.ts        # PATCH / DELETE (editar/remover gol)
      dashboard/
        route.ts                  # GET /api/dashboard?periodo=semana|mes|ano
      metrics/
        route.ts                  # GET /metrics (Prometheus)

  components/
    ui/                           # Componentes shadcn/ui (Button, Input, etc.)
    layout/
      NavSidebar.tsx
      Header.tsx
      MobileNav.tsx
    jogadores/
      JogadorCard.tsx
      JogadorForm.tsx
      JogadorListagem.tsx
    ciclos/
      CicloCard.tsx
      CicloForm.tsx
      CicloRanking.tsx            # Artilheiro, lider de passe, maior vencedor
    game-day/
      TimeMontagem.tsx            # Drag-and-drop ou selecao de jogadores
      TimeCard.tsx
      PartidaCard.tsx
    partidas/
      Cronometro.tsx              # Client Component com setInterval
      MarcarGolForm.tsx           # Formulario rapido (jogador + assistencia)
      ListaGols.tsx               # Gols da partida com opcao de edicao
      PartidaStatus.tsx           # Placar ao vivo
    dashboard/
      EstatisticaCard.tsx
      RankingTable.tsx
      FiltroPeriodo.tsx           # semana / mes / ano

  lib/
    db.ts                         # Singleton do Prisma Client
    validations/
      jogador.ts                  # Zod schema para jogador
      ciclo.ts
      dia-de-jogo.ts
      partida.ts
      gol.ts
    utils.ts                      # Helpers gerais (formatacao de tempo, etc.)
    api-client.ts                 # Wrappers fetch tipados (uso client-side)

  types/
    index.ts                      # Tipos TypeScript compartilhados (re-export Prisma types)

  hooks/
    useCronometro.ts              # Hook do cronometro (setInterval + persistencia)
    usePartidaAoVivo.ts           # Polling/revalidacao da partida ativa
```

---

## Padroes por Tipo de Pagina

### Pagina de Listagem (Server Component)

```
page.tsx (Server Component)
  |-- busca dados via Prisma diretamente
  |-- passa props para Client Component de listagem
  |-- nao usa useEffect nem useState
```

Exemplo: `(jogadores)/jogadores/page.tsx`
```typescript
// Server Component — sem 'use client'
import { prisma } from '@/lib/db'
import { JogadorListagem } from '@/components/jogadores/JogadorListagem'

export default async function JogadoresPage() {
  const jogadores = await prisma.jogador.findMany({
    where: { deletedAt: null },
    orderBy: { nome: 'asc' },
  })
  return <JogadorListagem jogadores={jogadores} />
}
```

### Formulario (Client Component + Server Action ou Route Handler)

Formularios usam Client Components com `useForm` (react-hook-form + Zod resolver)
e submetem via fetch para o Route Handler correspondente.

```
FormularioXxx.tsx (Client Component — 'use client')
  |-- react-hook-form + zodResolver(schema)
  |-- onSubmit → fetch POST /api/xxx
  |-- feedback: toast (sonner) + redirect via router.push
```

### Tela ao Vivo da Partida (Client Component com polling)

A tela de partida e totalmente client-side para responsividade do cronometro.
O estado do banco e a fonte de verdade; o cliente sincroniza via polling.

```
PartidaPage
  |-- usePartidaAoVivo (SWR com refreshInterval: 5000)
  |-- Cronometro (setInterval local, sincronizado com inicio_em do banco)
  |-- MarcarGolForm (POST /api/.../gols — otimista via SWR mutate)
  |-- ListaGols (com DELETE/PATCH inline)
  |-- PartidaStatus (placar calculado no cliente)
```

---

## Route Handlers — Convencoes

| Aspecto | Padrao |
|---------|--------|
| Validacao de entrada | `schema.safeParse(await req.json())` — retorna 422 se invalido |
| Erro de negocio | `NextResponse.json({ error: 'mensagem' }, { status: 400 })` |
| Erro interno | `NextResponse.json({ error: 'Erro interno' }, { status: 500 })` |
| Sucesso com dado | `NextResponse.json(data, { status: 200 })` |
| Criacao | `NextResponse.json(data, { status: 201 })` |
| Sem corpo | `new NextResponse(null, { status: 204 })` |
| Tipos de retorno | Sempre tipados com `NextResponse<T>` ou inferencia do Prisma |

---

## Endpoints da API Routes

### Saude
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/health` | Retorna `{ status: "ok", db: "ok" \| "error" }` |

### Jogadores
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/jogadores` | Lista jogadores ativos (sem deletedAt) |
| POST | `/api/jogadores` | Cria jogador |
| GET | `/api/jogadores/[id]` | Busca jogador por ID |
| PATCH | `/api/jogadores/[id]` | Atualiza jogador |
| DELETE | `/api/jogadores/[id]` | Soft delete (seta deletedAt) |

### Ciclos
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/ciclos` | Lista ciclos |
| POST | `/api/ciclos` | Cria ciclo |
| GET | `/api/ciclos/[id]` | Detalhe do ciclo com rankings |
| PATCH | `/api/ciclos/[id]` | Atualiza ciclo |

### Dias de Jogo
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/dias-de-jogo` | Lista dias |
| POST | `/api/dias-de-jogo` | Cria dia de jogo |
| GET | `/api/dias-de-jogo/[id]` | Detalhe: times + partidas |
| PATCH | `/api/dias-de-jogo/[id]` | Atualiza status (iniciado/finalizado) |
| POST | `/api/dias-de-jogo/[id]/times` | Monta os 3 times (substitui se ja existirem) |
| GET | `/api/dias-de-jogo/[id]/times` | Lista times do dia |
| POST | `/api/dias-de-jogo/[id]/partidas` | Inicia nova partida |

### Partidas
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/dias-de-jogo/[id]/partidas/[partidaId]` | Estado da partida |
| PATCH | `/api/dias-de-jogo/[id]/partidas/[partidaId]` | Finaliza partida (vencedor/empate) |
| POST | `/api/dias-de-jogo/[id]/partidas/[partidaId]/gols` | Marca gol (+assistencia opcional) |
| PATCH | `/api/dias-de-jogo/[id]/partidas/[partidaId]/gols/[golId]` | Edita gol |
| DELETE | `/api/dias-de-jogo/[id]/partidas/[partidaId]/gols/[golId]` | Remove gol |

### Dashboard
| Metodo | Caminho | Descricao |
|--------|---------|-----------|
| GET | `/api/dashboard?periodo=semana\|mes\|ano` | Estatisticas agregadas |

---

## Cronometro — Logica

O cronometro e gerenciado exclusivamente no cliente. A partida e iniciada
via PATCH na API com `{ inicio_em: new Date().toISOString() }`. O cliente
calcula o tempo decorrido subtraindo `Date.now() - inicio_em`.

```
Condicoes de fim de partida:
  - Tempo decorrido >= 7 * 60 * 1000 ms (7 minutos)
  - Qualquer time atingir 2 gols

Ao atingir condicao: desabilitar marcacao de gol, exibir botao "Finalizar Partida".
O usuario confirma e o cliente chama PATCH /api/.../partidas/[id] com o vencedor.
```

---

## Regras de Negocio no Frontend

| Regra | Onde implementada |
|-------|-------------------|
| Times: exatamente 3 times x 6 jogadores | Validacao Zod no Route Handler + feedback visual no formulario |
| Partida: max 2 gols por time | Route Handler rejeita gol se time ja tem 2 |
| Cronometro: 7 min | useCronometro desabilita acoes ao atingir limite |
| Soft delete de jogador | DELETE seta deletedAt; listas filtram `deletedAt: null` |
| Jogador convidado | Flag `convidado: boolean` exibida com badge na UI |
| Edicao de gol | Disponivel enquanto partida nao finalizada |

---

## Componente Cronometro — Interface

```typescript
// hooks/useCronometro.ts
interface UseCronometroReturn {
  tempoDecorrido: number     // milissegundos
  tempoFormatado: string     // "MM:SS"
  esgotado: boolean          // >= 7 minutos
  emAndamento: boolean
}

function useCronometro(inicioEm: Date | null): UseCronometroReturn
```

---

## Gestao de Estado Client-Side

Sem gerenciador de estado global. Estado e colocado no nivel mais proximo
de onde e usado:

| Contexto | Mecanismo |
|----------|-----------|
| Dados de pagina | Server Component (sem estado) |
| Formularios | react-hook-form (estado local do form) |
| Partida ao vivo | SWR com `refreshInterval: 5000` |
| Cronometro | useState + setInterval (local) |
| Notificacoes | sonner (toast) |
| Modal/Dialog | shadcn/ui Dialog (estado local com useState) |

---

## Configuracao Next.js

```typescript
// next.config.ts
const config: NextConfig = {
  output: 'standalone',           // Build otimizado para Docker
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
}
```

---

## Variaveis de Ambiente

| Variavel | Onde | Descricao |
|----------|------|-----------|
| `DATABASE_URL` | `.env` (nao commitado) | Connection string MySQL para Prisma |
| `NEXT_PUBLIC_APP_URL` | `.env` | URL publica do app (usada em redirects) |
| `NODE_ENV` | Docker Compose | `production` em producao |

---

## Acessibilidade e UX

| Aspecto | Decisao |
|---------|---------|
| Mobile-first | Layouts com breakpoints sm/md; nav colapsavel em mobile |
| Touch targets | Botoes de gol com area >= 48x48px (uso em campo) |
| Feedback de acao | Toast (sonner) para sucesso/erro em mutacoes |
| Loading states | Suspense + loading.tsx nas paginas SSR |
| Formularios | Mensagens de erro inline (react-hook-form) |

---

## Padroes de Arquivo (Convencoes Obrigatorias)

| Tipo | Convencao |
|------|-----------|
| Server Component | Sem `'use client'`; nome PascalCase; arquivo `page.tsx` ou componente |
| Client Component | Primeira linha `'use client'`; nome PascalCase |
| Route Handler | Arquivo `route.ts`; exporta funcoes nomeadas GET, POST, PATCH, DELETE |
| Hook customizado | Prefixo `use`; arquivo em `src/hooks/` |
| Schema Zod | Sufixo `Schema`; ex: `JogadorSchema`; arquivo em `src/lib/validations/` |
| Tipos Prisma | Re-exportados de `src/types/index.ts`; nao importar de `@prisma/client` diretamente |

---

## Proximos Passos (apos aprovacao)

- [ ] Aprovar este documento (GATE 2A)
- [ ] agente-implementador-frontend criar estrutura de pastas e fundacao
- [ ] Instalar dependencias: `react-hook-form`, `zod`, `@hookform/resolvers`, `swr`, `sonner`, `tailwindcss`, `shadcn/ui`, `lucide-react`
- [ ] Configurar `next.config.ts` com `output: 'standalone'`
- [ ] Implementar `/api/health` como primeiro endpoint
- [ ] Implementar modulo de jogadores como referencia de padrao
