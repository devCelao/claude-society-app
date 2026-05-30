# Arquitetura Geral — claude-society-app
**Versao:** 1
**Data:** 2026-05-29
**Escopo:** Fullstack Monolito
**Status:** Aprovada

---

## Contexto e Escopo

Sistema para gerenciamento de um grupo de futebol society. Controla jogadores,
times do dia, jogos semanais e ciclos mensais de competicao. O grupo joga toda
semana com 3 times de 6 pessoas; os times sao formados no dia e nao tem elenco
fixo. Um ciclo mensal premia artilheiro, lider de passe e maior vencedor (quem
mais aparece em fotos).

O sistema e de uso pessoal/do grupo, sem exposicao publica. A autenticacao e
gerenciada pelo Traefik (Basic Auth ou Forward Auth), entao o app nao implementa
login proprio.

Escala esperada: dezenas de usuarios, operacao local ou VPS simples. SLA informal.

---

## Decisao de Stack — Monolito

Por se tratar de um app simples e de uso pessoal, a arquitetura usa um unico
servico de aplicacao para frontend e backend, eliminando complexidade desnecessaria.

| Decisao | Escolha | Justificativa |
|---------|---------|---------------|
| Framework | Next.js 14 (App Router) | Fullstack em um servico: UI + API Routes no mesmo processo |
| Linguagem | TypeScript | Type safety, ecossistema robusto |
| ORM | Prisma | Migrations declarativas, type-safe, compativel com MySQL |
| Banco | MySQL 8 | Padrao da fabrica; suporte a JSON, indices compostos |
| Proxy | Traefik | Padrao da fabrica; TLS, autenticacao de borda |
| Container | Docker + Docker Compose | Reproducibilidade |
| Metricas | Prometheus + Grafana | Padrao da fabrica; observabilidade minima |
| Sem Worker | — | Nao ha processamento assincrono; tudo e sincrono no monolito |
| Sem RabbitMQ | — | Nao ha comunicacao entre servicos |

---

## Visao Geral dos Servicos

| Servico | Tipo | Tecnologia | Responsabilidade |
|---------|------|-----------|-----------------|
| `app` | Monolito Fullstack | Next.js 14 + TypeScript | UI (React) + API Routes (REST) |
| `db` | Database | MySQL 8 | Persistencia relacional |
| `traefik` | Proxy Reverso | Traefik v3 | Roteamento, TLS, autenticacao de borda |

---

## Diagrama de Comunicacao

```
Internet
   |
   |  HTTPS :443
   v
+------------------+
|     Traefik      |  Basic Auth (ou Forward Auth) na borda
+--------+---------+
         |
         |  HTTP interno (rede Docker)
         v
+------------------+
|    app           |  Next.js 14 — porta 3000
|                  |
|  /               |  React UI (App Router, Client Components)
|  /api/*          |  API Routes (Server Actions / Route Handlers)
|  /metrics        |  Prometheus metrics (next-prometheus)
+--------+---------+
         |
         |  TCP :3306 (rede Docker interna)
         v
+------------------+
|    db (MySQL)    |
+------------------+

Sem monitoramento — Prometheus e Grafana descartados.
```

---

## Modulos de Negocio (dentro do Monolito)

O monolito e organizado por dominios de negocio dentro do proprio Next.js.
Nao ha separacao de processos — apenas separacao de codigo por pasta.

| Modulo | Responsabilidade | Entidades Principais |
|--------|-----------------|----------------------|
| `jogadores` | Cadastro e edicao de jogadores | Jogador |
| `ciclos` | Criacao e controle de ciclos mensais | Ciclo |
| `dias-de-jogo` | Organizacao do dia: times, partidas | DiaDeJogo, Time, Partida |
| `partidas` | Controle ao vivo: cronometro, gols, assistencias | Partida, Gol, Assistencia |
| `dashboard` | Estatisticas agregadas por periodo | — (queries de leitura) |

---

## Fluxo de Negocio

```
[CICLO MENSAL]
  Criar Ciclo
      |
      v
  Criar Dia de Jogo (semanal, dentro do ciclo)
      |
      v
  Montar Times do Dia (3 times x 6 jogadores)
      |
      v
  Iniciar Dia de Jogo
      |
      +---> Cronometro (7 min ou 2 gols por partida)
      |
      +---> Marcar Gol (+ Assistencia opcional)
      |
      +---> Editar/Corrigir jogada
      |
      +---> Finalizar Partida (vencedor ou empate)
      |
      +---> Proxima partida (round robin entre 3 times)
      |
      v
  Finalizar Dia de Jogo
      |
      v
  Metricas atualizadas automaticamente
      |
      v
  [DASHBOARD] — filtros: semana, mes, ano
```

---

## Regras de Negocio Identificadas

| Regra | Detalhe |
|-------|---------|
| Times temporarios | Times existem apenas para o dia; nao sao persistidos entre dias |
| Jogadores convidados | Um jogador pode ser marcado como "convidado" (eventual) |
| Times | 3 times por dia, 6 jogadores por time |
| Duracao da partida | 7 minutos OU 2 gols (o que vier primeiro) |
| Vencedor | Time com mais gols; empate = nenhum ganha |
| Ciclo mensal | Premios: artilheiro, lider de passe, maior vencedor |
| Maior vencedor | Quem aparece mais vezes no time vencedor no ciclo |
| Edicao de jogada | Gol/Assistencia pode ser editado ou removido |
| Sem login | Autenticacao gerenciada pelo Traefik; app nao implementa sessao |

---

## Seguranca

| Camada | Mecanismo | Detalhe |
|--------|-----------|---------|
| Borda | TLS via Traefik | Certificado Let's Encrypt (ou self-signed para dev) |
| Autenticacao | Basic Auth no Traefik | Middleware do Traefik; app nao recebe requisicoes nao autenticadas |
| Rede | Docker network isolada | Apenas Traefik exposto externamente |
| Secrets | `.env` nao commitado + Docker Secrets | Senha do MySQL, credenciais do Grafana |
| API Routes | Sem autenticacao propria | Confia na borda do Traefik |

---

## Banco de Dados

| Aspecto | Decisao |
|---------|---------|
| Engine | MySQL 8 |
| Schema | `society_db` |
| Migrations | Prisma Migrate |
| Backup | Volume Docker persistente; backup manual ou script cron no host |
| Soft delete | Jogadores: sim (campo `deletedAt`). Demais entidades: nao |

---

## Observabilidade

| Componente | Porta | O que coleta |
|------------|-------|-------------|
| Prometheus | :9090 (interno) | Metricas do Next.js via `/metrics` |
| Grafana | :3001 (interno, exposto via Traefik) | Dashboards de latencia, erros, requisicoes |

**Health checks obrigatorios:**
- app: `GET /api/health` — retorna `{ status: "ok", db: "ok" }`
- db: `mysqladmin ping` via Docker healthcheck

---

## Docker Compose — Estrutura

```yaml
services:
  traefik:          # Proxy reverso — unico servico com porta publica (:443, :80)
  app:              # Next.js 14 monolito — porta 3000 (interna)
  db:               # MySQL 8 — porta 3306 (interna)
  prometheus:       # Coleta de metricas — porta 9090 (interna)
  grafana:          # Dashboard — porta 3001 (interna, roteado pelo Traefik)

networks:
  claude_society_net:  # Rede isolada — todos os servicos (nome fixo para evitar conflito entre projetos Docker)

volumes:
  claude_society_mysql_data:  # Dados do MySQL
```

---

## Estrutura de Pastas do Monolito (Next.js)

```
src/
  app/
    (dashboard)/        # Paginas de dashboard e estatisticas
    (game-day)/         # Paginas do dia de jogo (cronometro, partidas)
    (players)/          # Paginas de jogadores
    (cycles)/           # Paginas de ciclos
    api/
      health/           # GET /api/health
      jogadores/        # CRUD de jogadores
      ciclos/           # CRUD de ciclos
      dias-de-jogo/     # CRUD de dias de jogo + times
      partidas/         # Controle de partidas (gols, assistencias)
      dashboard/        # Queries de estatisticas
  components/           # Componentes React reutilizaveis
  lib/
    db.ts               # Instancia do Prisma Client
    validations/        # Schemas Zod para validacao de entrada
  types/                # Tipos TypeScript compartilhados
prisma/
  schema.prisma         # Definicao do schema e migrations
  migrations/           # Arquivos de migracao gerados pelo Prisma
docs/
  arquitetura/          # Documentos de arquitetura
  padroes/              # Padroes de implementacao
```

---

## Riscos e Contramedidas

| Risco | Probabilidade | Impacto | Contramedida |
|-------|--------------|---------|--------------|
| MySQL unavailable na inicializacao | Media | Alto | `depends_on` com healthcheck no Compose; Prisma com retry |
| Perda de dados do cronometro se pagina fechar | Media | Medio | Estado do cronometro persistido no banco ao iniciar partida |
| Erro na marcacao de gol | Baixa | Baixo | Feature de edicao/remocao de jogada ja no escopo |
| Volume MySQL corrompido | Baixa | Alto | Documentar procedimento de backup no README |

---

## Plano de Rollback

Por ser um monolito com um unico servico de app:

1. `docker compose pull app` — baixa versao anterior da imagem (se usando registry)
2. `docker compose up -d app` — sobe a versao anterior
3. Se migration foi executada: rodar script `_down` correspondente antes do rollback

---

## Artefatos Derivados

- Frontend/App: `docs/arquitetura/arquitetura-frontend-imp.md` — gerado, aguardando GATE 2A
- Database: `docs/arquitetura/arquitetura-database-imp.md` — gerado, aguardando GATE 2C
- Agente DBA: `agente-dba-database` — agente global (~/.claude/agents/) responsavel pela infra pratica do banco

## Padroes de Implementacao

- `docs/padroes/server-component.md` — paginas de listagem SSR
- `docs/padroes/route-handler.md` — endpoints da API Routes
- `docs/padroes/client-form.md` — formularios client-side
- `docs/padroes/partida-ao-vivo.md` — cronometro e controle ao vivo

---

## Proximos Passos

- [x] Aprovar este documento (GATE 1) — aprovado em 2026-05-29
- [x] agente-arquiteto-frontend gerar arquitetura-frontend-imp.md
- [x] agente-arquiteto-database gerar arquitetura-database-imp.md
- [ ] Aprovar arquitetura-frontend-imp.md (GATE 2A)
- [ ] Aprovar arquitetura-database-imp.md (GATE 2C)
- [ ] Verificacao de consistencia final entre os artefatos (pos GATE 2A + 2C)
- [ ] Criar esqueleto CLAUDE.md (Fase 4.1)
- [ ] Acionar agente-implementador-frontend (apos GATE 2A)
- [ ] Acionar agente-dba-database (apos GATE 2C) — cria compose + init scripts + aguarda GATE 3D-EXEC
- [ ] Acionar agente-implementador-database (apos GATE 3D-EXEC — banco de pe)
