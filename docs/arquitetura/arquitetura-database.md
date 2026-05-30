# Arquitetura Database — claude-society-app
**Versao:** 1
**Data:** 2026-05-29
**Tipo:** Implementacao nova (imp)
**Engine:** MySQL 8
**ORM:** Prisma
**Status:** Proposta

---

## Contexto

Banco unico para o monolito. Schema `claude_society_db`. Gerenciado por Prisma Migrate.
Escala: dezenas de usuarios, operacao em VPS simples ou local.
Sem multitenancy. Sem replicacao. Backup via volume Docker + script manual.

---

## Decisoes de Modelagem

| Decisao | Escolha | Justificativa |
|---------|---------|---------------|
| Soft delete | Apenas `Jogador` (campo `deletedAt`) | Outros registros sao historicos imutaveis |
| Times | Persistidos por dia de jogo | Necessario para calculo de vitorias do ciclo |
| Partida | Entidade propria com `inicio_em` e `fim_em` | Permite calcular duracao e reiniciar cronometro |
| Gol e Assistencia | Entidades separadas | Assistencia e opcional; relacao 1 Gol : 0..1 Assistencia |
| IDs | `INT AUTO_INCREMENT` | Suficiente para a escala; Prisma suporta nativamente |
| Charset | `utf8mb4` | Suporte a emojis e caracteres especiais em nomes |
| Indices | Chaves estrangeiras + indices em colunas de filtro frequente | Performance nas queries de dashboard |
| Status como ENUM | Sim (DiaDeJogo, Partida) | Valida no banco, documentado no schema |

---

## Diagrama Entidade-Relacionamento

```
Jogador (1) ────────────────── (N) JogadorTime
  |                                     |
  |                                     |
  +──── (N) Gol                    Time (N) ─── (1) DiaDeJogo (N) ─── (1) Ciclo
  |          |                          |              |
  +──── (N) Assistencia                 |         Partida (N)
                                        |              |
                              time_a_id ┤              |
                              time_b_id ┤              |
                              vencedor_id (nullable)   |
                                                  Gol (N)
                                                   |
                                              Assistencia (0..1)
```

---

## Schema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// JOGADOR
// ──────────────────────────────────────────
model Jogador {
  id         Int       @id @default(autoincrement())
  nome       String    @db.VarChar(100)
  apelido    String?   @db.VarChar(60)
  convidado  Boolean   @default(false)
  deletedAt  DateTime? @map("deleted_at")
  criadoEm   DateTime  @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  jogadorTimes JogadorTime[]
  gols         Gol[]
  assistencias Assistencia[]

  @@map("jogadores")
}

// ──────────────────────────────────────────
// CICLO
// ──────────────────────────────────────────
model Ciclo {
  id          Int       @id @default(autoincrement())
  nome        String    @db.VarChar(100)   // ex: "Maio 2026"
  inicioEm    DateTime  @map("inicio_em")
  fimEm       DateTime  @map("fim_em")
  criadoEm    DateTime  @default(now()) @map("criado_em")

  diasDeJogo  DiaDeJogo[]

  @@map("ciclos")
}

// ──────────────────────────────────────────
// DIA DE JOGO
// ──────────────────────────────────────────
enum StatusDiaDeJogo {
  PENDENTE
  EM_ANDAMENTO
  FINALIZADO
}

model DiaDeJogo {
  id       Int              @id @default(autoincrement())
  cicloId  Int              @map("ciclo_id")
  data     DateTime         @db.Date
  status   StatusDiaDeJogo  @default(PENDENTE)
  criadoEm DateTime         @default(now()) @map("criado_em")

  ciclo    Ciclo    @relation(fields: [cicloId], references: [id])
  times    Time[]
  partidas Partida[]

  @@index([cicloId])
  @@map("dias_de_jogo")
}

// ──────────────────────────────────────────
// TIME (temporario por dia)
// ──────────────────────────────────────────
model Time {
  id          Int      @id @default(autoincrement())
  diaDeJogoId Int      @map("dia_de_jogo_id")
  nome        String   @db.VarChar(60)    // "Time A", "Time B", "Time C"
  cor         String?  @db.VarChar(30)    // para diferenciar na UI

  diaDeJogo   DiaDeJogo    @relation(fields: [diaDeJogoId], references: [id])
  jogadores   JogadorTime[]

  // Times em que este time foi time_a
  partidasComoA Partida[] @relation("TimeA")
  // Times em que este time foi time_b
  partidasComoB Partida[] @relation("TimeB")
  // Partidas que este time venceu
  vitorias      Partida[] @relation("Vencedor")

  @@index([diaDeJogoId])
  @@map("times")
}

// ──────────────────────────────────────────
// JOGADOR_TIME (membros do time no dia)
// ──────────────────────────────────────────
model JogadorTime {
  id        Int @id @default(autoincrement())
  timeId    Int @map("time_id")
  jogadorId Int @map("jogador_id")

  time    Time    @relation(fields: [timeId], references: [id])
  jogador Jogador @relation(fields: [jogadorId], references: [id])

  @@unique([timeId, jogadorId])
  @@index([jogadorId])
  @@map("jogador_time")
}

// ──────────────────────────────────────────
// PARTIDA
// ──────────────────────────────────────────
enum StatusPartida {
  AGUARDANDO    // criada, nao iniciada
  EM_ANDAMENTO  // cronometro rodando
  FINALIZADA
}

model Partida {
  id          Int           @id @default(autoincrement())
  diaDeJogoId Int           @map("dia_de_jogo_id")
  timeAId     Int           @map("time_a_id")
  timeBId     Int           @map("time_b_id")
  vencedorId  Int?          @map("vencedor_id")   // null = empate
  status      StatusPartida @default(AGUARDANDO)
  inicioEm    DateTime?     @map("inicio_em")     // quando cronometro foi iniciado
  fimEm       DateTime?     @map("fim_em")
  ordem       Int           // sequencia da partida no dia (1, 2, 3...)
  criadoEm    DateTime      @default(now()) @map("criado_em")

  diaDeJogo DiaDeJogo @relation(fields: [diaDeJogoId], references: [id])
  timeA     Time      @relation("TimeA", fields: [timeAId], references: [id])
  timeB     Time      @relation("TimeB", fields: [timeBId], references: [id])
  vencedor  Time?     @relation("Vencedor", fields: [vencedorId], references: [id])
  gols      Gol[]

  @@index([diaDeJogoId])
  @@map("partidas")
}

// ──────────────────────────────────────────
// GOL
// ──────────────────────────────────────────
model Gol {
  id        Int      @id @default(autoincrement())
  partidaId Int      @map("partida_id")
  timeId    Int      @map("time_id")      // time que marcou o gol
  jogadorId Int      @map("jogador_id")   // artilheiro
  marcadoEm DateTime @default(now()) @map("marcado_em")

  partida    Partida      @relation(fields: [partidaId], references: [id])
  jogador    Jogador      @relation(fields: [jogadorId], references: [id])
  assistencia Assistencia?

  @@index([partidaId])
  @@index([jogadorId])
  @@map("gols")
}

// ──────────────────────────────────────────
// ASSISTENCIA (0..1 por gol)
// ──────────────────────────────────────────
model Assistencia {
  id        Int @id @default(autoincrement())
  golId     Int @unique @map("gol_id")      // 1 assistencia por gol no maximo
  jogadorId Int @map("jogador_id")

  gol     Gol     @relation(fields: [golId], references: [id], onDelete: Cascade)
  jogador Jogador @relation(fields: [jogadorId], references: [id])

  @@index([jogadorId])
  @@map("assistencias")
}
```

---

## Indices Criticos

| Tabela | Indice | Motivo |
|--------|--------|--------|
| `jogadores` | `deleted_at` | Filtro `WHERE deleted_at IS NULL` em toda listagem |
| `dias_de_jogo` | `ciclo_id` | JOIN frequente ciclo → dias |
| `dias_de_jogo` | `data` | Filtro por periodo no dashboard |
| `times` | `dia_de_jogo_id` | JOIN dia → times |
| `jogador_time` | `(time_id, jogador_id)` UNIQUE | Impede duplicata; serve como indice |
| `jogador_time` | `jogador_id` | Queries de participacao do jogador |
| `partidas` | `dia_de_jogo_id` | JOIN dia → partidas |
| `gols` | `partida_id` | Contagem de gols por partida |
| `gols` | `jogador_id` | Ranking de artilheiros |
| `assistencias` | `gol_id` UNIQUE | 1 assistencia por gol |
| `assistencias` | `jogador_id` | Ranking de passes |

---

## Regras de Integridade no Banco

| Regra | Implementacao |
|-------|---------------|
| Cascata ao deletar gol | `Assistencia.golId` com `onDelete: Cascade` |
| Jogador soft-delete | Campo `deleted_at`; sem FK constraint quebrada |
| Vencedor nullable | `vencedorId` nullable — null = empate ou em andamento |
| Time unico por dia | Sem constraint de banco (regra de negocio no Route Handler) |
| Max 2 gols por time | Verificado no Route Handler antes do INSERT |

---

## Queries de Dashboard (padroes)

### Artilheiro do periodo
```sql
SELECT j.id, j.nome, COUNT(g.id) AS total_gols
FROM gols g
JOIN partidas p ON p.id = g.partida_id
JOIN dias_de_jogo ddj ON ddj.id = p.dia_de_jogo_id
JOIN jogadores j ON j.id = g.jogador_id
WHERE ddj.data BETWEEN :inicio AND :fim
  AND p.status = 'FINALIZADA'
GROUP BY j.id, j.nome
ORDER BY total_gols DESC
LIMIT 10;
```

### Lider de passe do periodo
```sql
SELECT j.id, j.nome, COUNT(a.id) AS total_assistencias
FROM assistencias a
JOIN gols g ON g.id = a.gol_id
JOIN partidas p ON p.id = g.partida_id
JOIN dias_de_jogo ddj ON ddj.id = p.dia_de_jogo_id
JOIN jogadores j ON j.id = a.jogador_id
WHERE ddj.data BETWEEN :inicio AND :fim
  AND p.status = 'FINALIZADA'
GROUP BY j.id, j.nome
ORDER BY total_assistencias DESC
LIMIT 10;
```

### Maior vencedor do ciclo (aparicoes em time vencedor)
```sql
SELECT j.id, j.nome, COUNT(DISTINCT p.id) AS vitorias
FROM partidas p
JOIN times t ON t.id = p.vencedor_id
JOIN jogador_time jt ON jt.time_id = t.id
JOIN jogadores j ON j.id = jt.jogador_id
JOIN dias_de_jogo ddj ON ddj.id = p.dia_de_jogo_id
WHERE ddj.ciclo_id = :ciclo_id
  AND p.status = 'FINALIZADA'
  AND p.vencedor_id IS NOT NULL
GROUP BY j.id, j.nome
ORDER BY vitorias DESC
LIMIT 10;
```

---

## Configuracao MySQL (Docker)

```yaml
# docker-compose.yml — servico db
# Configuracao detalhada gerada pelo agente-dba-database (FASE 3D)
db:
  image: mysql:8.0
  environment:
    MYSQL_DATABASE: claude_society_db
    MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
    MYSQL_USER: claude_society_user
    MYSQL_PASSWORD_FILE: /run/secrets/mysql_app_password
  volumes:
    - claude_society_mysql_data:/var/lib/mysql
    - ./database/init:/docker-entrypoint-initdb.d:ro
  secrets:
    - mysql_root_password
    - mysql_app_password
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
  networks:
    - claude_society_net
  deploy:
    resources:
      limits:
        memory: 512m
```

> **Nota:** A configuracao completa do `docker-compose.yml` (network, volumes, secrets)
> e responsabilidade do `agente-dba-database`. Este snippet e apenas referencia arquitetural.

---

## Variaveis de Ambiente

| Variavel | Exemplo | Descricao |
|----------|---------|-----------|
| `DATABASE_URL` | `mysql://claude_society_user:senha@db:3306/claude_society_db` | Connection string do Prisma |
| `MYSQL_ROOT_PASSWORD` | (secret via Docker Secrets) | Senha root do MySQL |
| `MYSQL_APP_PASSWORD` | (secret via Docker Secrets) | Senha do usuario `claude_society_user` |

---

## Ciclo de Vida das Migrations

```
Desenvolvimento:
  npx prisma migrate dev --name <descricao>
    → gera arquivo em prisma/migrations/
    → aplica no banco local

Producao (dentro do container):
  npx prisma migrate deploy
    → aplica migrations pendentes
    → executado no entrypoint do container antes de iniciar o app
```

---

## Backup

| Aspecto | Decisao |
|---------|---------|
| Mecanismo | `mysqldump` via script cron no host |
| Frequencia recomendada | Semanal (uso pessoal) |
| Destino | Volume separado ou diretorio do host fora do container |
| Comando | `docker exec <db_container> mysqldump -u root -p society_db > backup_$(date +%Y%m%d).sql` |

---

## Seed Inicial

Script de seed para dados de desenvolvimento:
- 18 jogadores ficticios (suficiente para 3 times x 6)
- 1 ciclo ativo
- 0 dias de jogo (criados manualmente no app)

```
npx prisma db seed
  → executa prisma/seed.ts
```

---

## Riscos e Contramedidas

| Risco | Probabilidade | Impacto | Contramedida |
|-------|--------------|---------|--------------|
| Volume MySQL corrompido | Baixa | Alto | Documentar backup semanal; testar restore |
| Migration falha em producao | Baixa | Alto | `prisma migrate deploy` no entrypoint; rollback via script _down manual |
| Connection pool esgotado | Muito baixa | Medio | Singleton do Prisma Client em `lib/db.ts` (reutiliza pool) |
| Dados inconsistentes (gol sem partida) | Nao aplicavel | — | FK constraints no banco; Prisma valida relacoes |

---

## Proximos Passos (apos aprovacao)

- [x] Aprovar este documento (GATE 2C) — aprovado em 2026-05-29
- [ ] **agente-dba-database** (FASE 3D): criar docker-compose.yml + database/init/ + dba-setup.md → aguardar GATE 3D-EXEC
- [ ] **agente-implementador-database** (FASE 3C): gerar scripts SQL _up + _down e execution-order.md — somente apos GATE 3D-EXEC
- [ ] Configurar `prisma/schema.prisma` com o schema definido acima
- [ ] Executar `npx prisma migrate dev --name init` para gerar a migration inicial
- [ ] Criar `prisma/seed.ts` com jogadores ficticios para desenvolvimento
- [ ] Configurar entrypoint do container para rodar `prisma migrate deploy` antes de `next start`
