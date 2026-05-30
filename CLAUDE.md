# claude-society-app — Governanca Claude Code

## REGRAS DE GOVERNANCA (LEIA PRIMEIRO)

### 1. Modo de Operacao Obrigatorio
- SEMPRE iniciar em modo PLAN — nunca executar diretamente
- SO EXECUTAR COM OK EXPLICITO do usuario

### 2. Blindagem Total
- NAO EXECUTAR nenhuma tarefa fora das orientacoes documentadas
- Se a solicitacao nao se encaixa em nenhum padrao: PARAR e sinalizar ao usuario

### 3. Tratamento de Ambiguidade
- Se qualquer informacao estiver ambigua: PERGUNTAR ANTES
- NUNCA assumir quando houver duvida

### 4. Fluxo de Confirmacao
```
[Usuario solicita] -> [Agente analisa] -> [Agente apresenta PLANO]
    -> [Usuario confirma OK] -> [Agente executa] -> [Agente reporta]
```
NUNCA pular a etapa de confirmacao.

---

## CONTEXTO DO SISTEMA

**Nome:** claude-society-app
**Escopo:** Monolito Fullstack (Next.js — UI + API no mesmo processo)
**Proposito:** Gerenciamento de grupo de futebol society: jogadores, ciclos mensais, dias de jogo, partidas ao vivo, dashboard de estatisticas.
**Usuarios:** Grupo fechado (~18 pessoas). Sem exposicao publica. Sem login proprio (Traefik faz Basic Auth na borda).
**Arquitetura geral:** `docs/arquitetura/arquitetura-geral.md`
**Estado do fluxo:** `docs/arquitetura/estado.md`

---

## STACK

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Framework | Next.js App Router | 14+ |
| Linguagem | TypeScript | 5+ |
| ORM | Prisma | latest |
| Banco | MySQL | 8.0 |
| Estilos | Tailwind CSS | 3+ |
| Componentes UI | shadcn/ui (base Radix UI) | latest |
| Icones | lucide-react | latest |
| Formularios | react-hook-form + zodResolver | latest |
| Validacao | Zod | 3+ |
| Fetch reativo | SWR | 2+ |
| Notificacoes | sonner (toast) | latest |
| Proxy | Traefik | v3 |
| Containers | Docker + Docker Compose | latest |
| Metricas | — | Descartado (sem monitoramento) |

---

## ESTRUTURA DE PASTAS

```
D:\GIT_REPS\claude-society-app\
  CLAUDE.md                          <- este arquivo
  docker-compose.yml
  docker-compose.override.yml        <- overrides de dev (carregado automaticamente)
  .env                               <- NAO commitado; vars de ambiente
  .gitignore

  frontend/                          <- TODO o codigo Next.js fica aqui
    Dockerfile
    .dockerignore
    next.config.mjs
    tailwind.config.ts
    tsconfig.json
    package.json
    components.json                  <- config shadcn/ui
    prisma.config.ts                 <- config Prisma 7 (datasource URL)

    prisma/
      schema.prisma                  <- schema completo do banco
      migrations/                    <- gerado por prisma migrate
      seed.ts                        <- seed de desenvolvimento (18 jogadores)

    src/
      generated/
        prisma/                      <- client Prisma gerado (npx prisma generate)

      app/
        layout.tsx                   <- layout raiz (fonte, tema, Toaster)
        page.tsx                     <- redirect para /dashboard

        (dashboard)/
          layout.tsx                 <- nav lateral
          dashboard/
            page.tsx                 <- Server Component — SSR
            loading.tsx

        (jogadores)/
          jogadores/
            page.tsx                 <- Server Component — lista
            novo/page.tsx
            [id]/editar/page.tsx

        (ciclos)/
          ciclos/
            page.tsx
            novo/page.tsx
            [id]/page.tsx            <- detalhe + ranking do ciclo

        (game-day)/
          dias-de-jogo/
            page.tsx
            novo/page.tsx
            [id]/
              page.tsx               <- visao geral: times + partidas
              montar-times/page.tsx
              partidas/
                [partidaId]/
                  page.tsx           <- TELA AO VIVO ('use client')

        api/
          health/route.ts            <- GET /api/health
          jogadores/
            route.ts                 <- GET, POST
            [id]/route.ts            <- GET, PATCH, DELETE (soft)
          ciclos/
            route.ts                 <- GET, POST
            [id]/route.ts            <- GET, PATCH
          dias-de-jogo/
            route.ts                 <- GET, POST
            [id]/
              route.ts               <- GET, PATCH
              times/route.ts         <- GET, POST (montar times)
              partidas/
                route.ts             <- POST (nova partida)
                [partidaId]/
                  route.ts           <- GET, PATCH (finalizar)
                  gols/
                    route.ts         <- POST (marcar gol)
                    [golId]/route.ts <- PATCH, DELETE
          dashboard/route.ts         <- GET ?periodo=semana|mes|ano

      components/
        ui/                          <- componentes shadcn/ui (Button, Input, etc.)
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
          CicloRanking.tsx
        game-day/
          TimeMontagem.tsx
          TimeCard.tsx
          PartidaCard.tsx
        partidas/
          Cronometro.tsx             <- Client Component; setInterval
          MarcarGolForm.tsx
          ListaGols.tsx
          PartidaStatus.tsx
        dashboard/
          EstatisticaCard.tsx
          RankingTable.tsx
          FiltroPeriodo.tsx

      hooks/
        useCronometro.ts             <- setInterval + calculo de tempo restante
        usePartidaAoVivo.ts          <- SWR polling a cada 5s

      lib/
        db.ts                        <- Singleton do Prisma Client
        api-client.ts                <- Wrappers fetch tipados (uso client-side)
        utils.ts                     <- Helpers gerais
        validations/
          jogador.ts
          ciclo.ts
          dia-de-jogo.ts
          partida.ts
          gol.ts

      types/
        index.ts                     <- Re-exporta tipos do Prisma; NAO importar direto

  database/                          <- scripts de banco de dados
    init/                            <- executados automaticamente pelo MySQL (primeiro boot)
      01_database.sql
      02_users.sql
      03_grants.sql
    setup/                           <- scripts de schema (tabelas, indices, FKs)
    dba-setup.md

  docs/
    arquitetura/
      arquitetura-geral.md
      arquitetura-frontend.md        <- referencia principal para implementacao frontend
      arquitetura-database.md        <- referencia principal para database
      estado.md                      <- fonte de verdade do fluxo
    padroes/
      server-component.md
      route-handler.md
      client-form.md
      partida-ao-vivo.md
```

---

## ALIASES TYPESCRIPT

O alias `@/` aponta para `frontend/src/`. Exemplos:
- `@/lib/db` = `frontend/src/lib/db.ts`
- `@/components/jogadores/JogadorForm` = `frontend/src/components/jogadores/JogadorForm.tsx`
- `@/lib/validations/jogador` = `frontend/src/lib/validations/jogador.ts`
- `@/types` = `frontend/src/types/index.ts`
- `@/hooks/useCronometro` = `frontend/src/hooks/useCronometro.ts`

**Importante — Prisma 7:** o client e gerado em `frontend/src/generated/prisma/`.
Importar SEMPRE de `@/generated/prisma/client`, NUNCA de `@prisma/client` diretamente.

---

## VARIAVEIS DE AMBIENTE

Arquivo `.env` na raiz — NAO commitado. Nunca hardcodar credenciais.

| Variavel | Exemplo | Descricao |
|----------|---------|-----------|
| `DATABASE_URL` | `mysql://claude_society_user:senha@db:3306/claude_society_db` | Connection string Prisma |
| `NEXT_PUBLIC_APP_URL` | `https://society.local` | URL publica do app |
| `NODE_ENV` | `production` | Ambiente de execucao |

---

## COMANDOS UTEIS

### Desenvolvimento

```bash
# Todos os comandos npm/prisma devem ser executados DENTRO de frontend/
cd frontend

# Instalar dependencias
npm install

# Rodar em modo dev (com MySQL rodando via Docker)
npm run dev

# Verificar tipos TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Build de producao
npm run build
```

### Prisma

```bash
# Executar dentro de frontend/
cd frontend

# Gerar client Prisma (apos editar schema.prisma)
npx prisma generate

# Gerar migration a partir do schema.prisma
npx prisma migrate dev --name <descricao-da-mudanca>

# Aplicar migrations em producao (dentro do container)
npx prisma migrate deploy

# Abrir Prisma Studio (UI do banco)
npx prisma studio

# Rodar seed
npx prisma db seed
```

### Docker

```bash
# Subir toda a stack (da raiz do projeto)
docker compose up -d

# Ver logs do app
docker compose logs -f app

# Reconstruir imagem do app
docker compose build app

# Rodar migration dentro do container
docker compose exec app npx prisma migrate deploy

# Backup do banco
docker exec <container_db> mysqldump -u root -p claude_society_db > backup_$(date +%Y%m%d).sql

# Parar tudo
docker compose down
```

### shadcn/ui

```bash
# Executar dentro de frontend/
cd frontend

# Adicionar componente (exemplo: Button)
npx shadcn@latest add button

# Adicionar Card, Input, Dialog, etc.
npx shadcn@latest add card input dialog badge select
```

---

## PADROES DE IMPLEMENTACAO

Os padroes detalhados estao em `docs/padroes/`. Cada agente implementador DEVE ler o padrao correspondente antes de implementar. Abaixo um resumo de quando usar cada um:

| Tipo de tarefa | Padrao a seguir | Arquivo |
|----------------|----------------|---------|
| Pagina de listagem ou detalhe SSR | Server Component | `docs/padroes/server-component.md` |
| Endpoint REST (POST, PATCH, DELETE, GET) | Route Handler | `docs/padroes/route-handler.md` |
| Formulario de criacao ou edicao | Client Form | `docs/padroes/client-form.md` |
| Tela ao vivo da partida (cronometro + gols) | Partida ao Vivo | `docs/padroes/partida-ao-vivo.md` |

### Resumo das Convencoes Obrigatorias

#### Arquivos

| Tipo | Convencao |
|------|-----------|
| Server Component | SEM `'use client'`; PascalCase; `page.tsx` ou componente em `components/` |
| Client Component | PRIMEIRA LINHA: `'use client'`; PascalCase |
| Route Handler | `route.ts`; exporta funcoes nomeadas: `GET`, `POST`, `PATCH`, `DELETE` |
| Hook customizado | Prefixo `use`; arquivo em `frontend/src/hooks/` |
| Schema Zod | Sufixo `Schema` (ex: `JogadorSchema`); em `frontend/src/lib/validations/` |
| Tipos Prisma | Re-exportados de `frontend/src/types/index.ts`; NUNCA importar de `@prisma/client` ou `@/generated/prisma/client` diretamente — sempre via `@/types` |

#### Route Handlers — Codigos de Status

| Situacao | Status HTTP |
|----------|-------------|
| Sucesso com corpo | 200 |
| Criado | 201 |
| Sem corpo (DELETE bem-sucedido) | 204 |
| Dados invalidos (Zod) | 422 |
| Regra de negocio violada | 400 |
| Nao encontrado | 404 |
| Erro interno | 500 |

#### Regras de Validacao

1. SEMPRE validar entrada com `schema.safeParse()` antes de tocar no banco.
2. SEMPRE envolver Route Handlers em `try/catch`.
3. NUNCA retornar stack trace para o cliente — apenas logar no servidor.
4. Mensagens de erro em portugues (app em pt-BR).
5. Verificar regras de negocio ANTES da query de escrita.

---

## REGRAS DE NEGOCIO (FONTE DE VERDADE)

Estas regras devem ser implementadas e/ou validadas no Route Handler correspondente:

| Regra | Onde validar |
|-------|-------------|
| Times: exatamente 3 times por dia de jogo | Route Handler POST `/times` |
| Times: exatamente 6 jogadores por time | Route Handler POST `/times` |
| Partida: maximo 2 gols por time | Route Handler POST `/gols` — rejeita se time ja tem 2 |
| Cronometro: 7 minutos de duracao | `useCronometro` (cliente); finalizacao confirmada pelo usuario |
| Vencedor: time com mais gols; empate = `vencedorId: null` | Route Handler PATCH `/partidas/[id]` |
| Soft delete de jogador: `deletedAt` | Route Handler DELETE `/jogadores/[id]` |
| Listagens filtram deletedAt: `where: { deletedAt: null }` | Todas as queries de jogadores |
| Jogador convidado: flag `convidado: boolean` | Exibido com badge na UI |
| Edicao de gol: disponivel so enquanto partida nao FINALIZADA | Route Handler PATCH/DELETE `/gols/[id]` |
| Assistencia: opcional, max 1 por gol | Schema Prisma (`@unique golId`) + Route Handler |
| Ciclo: premia artilheiro, lider de passe, maior vencedor | Query do dashboard por `ciclo_id` |
| Maior vencedor: quem mais aparece em time vencedor no ciclo | Query em `docs/arquitetura/arquitetura-database.md` |

---

## MODULOS E SEUS ARTEFATOS

### jogadores
- Pagina: `frontend/src/app/(jogadores)/jogadores/page.tsx`
- API: `frontend/src/app/api/jogadores/route.ts` e `[id]/route.ts`
- Componentes: `frontend/src/components/jogadores/`
- Validacao: `frontend/src/lib/validations/jogador.ts`
- Padrao: server-component + route-handler + client-form

### ciclos
- Pagina: `frontend/src/app/(ciclos)/ciclos/page.tsx` e `[id]/page.tsx`
- API: `frontend/src/app/api/ciclos/route.ts` e `[id]/route.ts`
- Componentes: `frontend/src/components/ciclos/` (inclui `CicloRanking.tsx`)
- Validacao: `frontend/src/lib/validations/ciclo.ts`
- Padrao: server-component + route-handler + client-form

### dias-de-jogo
- Paginas: `frontend/src/app/(game-day)/dias-de-jogo/`
- API: `frontend/src/app/api/dias-de-jogo/` (inclui `/times` e `/partidas`)
- Componentes: `frontend/src/components/game-day/`
- Validacao: `frontend/src/lib/validations/dia-de-jogo.ts`
- Padrao: server-component + route-handler + client-form

### partidas (ao vivo)
- Pagina: `frontend/src/app/(game-day)/dias-de-jogo/[id]/partidas/[partidaId]/page.tsx`
- API: `.../partidas/[partidaId]/route.ts` e `.../gols/route.ts`
- Componentes: `frontend/src/components/partidas/`
- Hooks: `frontend/src/hooks/useCronometro.ts` e `usePartidaAoVivo.ts`
- Validacao: `frontend/src/lib/validations/partida.ts` e `gol.ts`
- Padrao: partida-ao-vivo (polling SWR + setInterval)

### dashboard
- Pagina: `frontend/src/app/(dashboard)/dashboard/page.tsx`
- API: `frontend/src/app/api/dashboard/route.ts`
- Componentes: `frontend/src/components/dashboard/`
- Queries: ver `docs/arquitetura/arquitetura-database.md`
- Padrao: server-component (com Client Component para filtro de periodo)

---

## SCHEMA DO BANCO (REFERENCIA RAPIDA)

Schema `claude_society_db`. Gerenciado por Prisma Migrate.

| Tabela | Chave Primaria | Observacao |
|--------|---------------|-----------|
| `jogadores` | `id` INT AI | Soft delete: `deleted_at` |
| `ciclos` | `id` INT AI | `inicio_em`, `fim_em` |
| `dias_de_jogo` | `id` INT AI | ENUM: `PENDENTE`, `EM_ANDAMENTO`, `FINALIZADO` |
| `times` | `id` INT AI | Temporario por dia; `nome` ("Time A/B/C"), `cor` |
| `jogador_time` | `id` INT AI | UNIQUE(`time_id`, `jogador_id`) |
| `partidas` | `id` INT AI | ENUM: `AGUARDANDO`, `EM_ANDAMENTO`, `FINALIZADA`; `vencedor_id` nullable (null = empate) |
| `gols` | `id` INT AI | FK: `partida_id`, `time_id`, `jogador_id` |
| `assistencias` | `id` INT AI | UNIQUE(`gol_id`); CASCADE ao deletar gol |

Schema Prisma completo: `frontend/prisma/schema.prisma`
Arquitetura database detalhada: `docs/arquitetura/arquitetura-database.md`

---

## ACESSO A DADOS — QUANDO USAR O QUE

| Situacao | Como acessar dados |
|----------|--------------------|
| Pagina SSR de listagem ou detalhe | `prisma.xxx.findMany()` diretamente no Server Component |
| Mutacao (criar, atualizar, deletar) | `fetch POST/PATCH/DELETE` para Route Handler |
| Partida ao vivo (estado reativo) | SWR `usePartidaAoVivo` com `refreshInterval: 5000` |
| Cronometro | `useCronometro(partida.inicioEm)` — calcula no cliente com `inicio_em` do banco |

NUNCA fazer fetch para `/api/*` em Server Components. Acessar Prisma diretamente.

---

## CRONOMETRO — LOGICA CRITICA

A partida dura **7 minutos OU 2 gols** (o que vier primeiro).

```typescript
// Condicao de fim de partida (calculada no cliente)
const golsTimeA = partida.gols.filter(g => g.timeId === partida.timeAId).length
const golsTimeB = partida.gols.filter(g => g.timeId === partida.timeBId).length
const alguemComDoisGols = golsTimeA >= 2 || golsTimeB >= 2

const deveEncerrar = cronometro.esgotado || alguemComDoisGols
```

- `inicio_em` do banco e a fonte de verdade do cronometro.
- O cliente calcula: `restante = 7min - (Date.now() - inicio_em)`.
- Ao `deveEncerrar`: desabilitar marcacao de gol + exibir botao "Finalizar Partida".
- O Route Handler PATCH valida o `vencedorId` antes de persistir.

---

## INFRAESTRUTURA

### Servicos Docker

| Servico | Imagem | Porta interna | Exposto externamente |
|---------|--------|---------------|---------------------|
| `traefik` | traefik:v3 | :80, :443 | Sim (:443) — UNICO ponto publico |
| `app` | node (build Next.js) | :3000 | Nao — via Traefik |
| `db` | mysql:8.0 | :3306 | Nao |

### Health Checks Obrigatorios

- `app`: `GET /api/health` — deve retornar `{ "status": "ok", "db": "ok" }`
- `db`: `mysqladmin ping` via Docker healthcheck

### Rede

Todos os servicos comunicam pela rede Docker `claude_society_net`. So o Traefik tem porta publica.
O nome fixo da network evita conflitos em servidores com multiplos projetos Docker.

### Secrets

Nunca hardcodar senhas. Usar Docker Secrets ou variaveis de ambiente fora de arquivos commitados.

---

## CONFIGURACAO NEXT.JS

```javascript
// frontend/next.config.mjs
const config = {
  output: 'standalone',   // otimizado para Docker
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
}
```

---

## ACESSIBILIDADE E UX

| Aspecto | Decisao |
|---------|---------|
| Mobile-first | Layouts com breakpoints sm/md; nav colapsavel em mobile |
| Touch targets | Botoes de gol com area minima 48x48px (uso em campo durante partida) |
| Feedback de acao | Toast (sonner): `toast.success` e `toast.error` |
| Loading states | `loading.tsx` ao lado de `page.tsx` para Suspense automatico |
| Erros de formulario | Mensagens inline abaixo do campo via `errors.campo.message` |
| Idioma | pt-BR — todas as mensagens de UI e erro em portugues |

---

## WORKFLOW DE IMPLEMENTACAO

### Para qualquer nova feature, siga esta ordem:

1. Ler `docs/arquitetura/estado.md` — verificar fase atual e impedimentos
2. Ler o artefato de arquitetura relevante (`arquitetura-frontend.md` ou `arquitetura-database.md`)
3. Identificar o tipo de tarefa (listagem, formulario, endpoint, partida ao vivo)
4. Ler o padrao correspondente em `docs/padroes/`
5. Apresentar PLANO ao usuario antes de executar
6. Aguardar OK explicito
7. Implementar seguindo o padrao
8. Verificar: TypeScript sem erros, lint ok, regras de negocio cobertas

### Identificacao de Tipo de Tarefa

| O que fazer | Tipo | Padrao |
|------------|------|--------|
| Pagina que lista ou exibe dados | Server Component | `docs/padroes/server-component.md` |
| Endpoint REST | Route Handler | `docs/padroes/route-handler.md` |
| Formulario de criar/editar | Client Form | `docs/padroes/client-form.md` |
| Tela com cronometro ou gols ao vivo | Partida ao Vivo | `docs/padroes/partida-ao-vivo.md` |

---

## ESTADO ATUAL DO FLUXO

Consultar sempre `docs/arquitetura/estado.md` para o estado atual.

Fases concluidas: 1, 2A, 2C, 3A, 4A.
Proxima fase: implementacao de features pelo Dev (fora do fluxo de fundacao).

---

## AGENTES DISPONIVEIS

| Agente | Fase | Responsabilidade |
|--------|------|-----------------|
| agente-arquiteto-orquestrador | FASE 1 | Arquitetura geral + orquestracao |
| agente-arquiteto-frontend | FASE 2A | Arquitetura frontend (Next.js) |
| agente-arquiteto-database | FASE 2C | Arquitetura de banco + scripts de init |
| agente-implementador-infra | FASE 3A | docker-compose, Dockerfiles, .env |
| agente-implementador-frontend | FASE 4A | Fundacao frontend em `frontend/` |
