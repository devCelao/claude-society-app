# DBA Implementation Plan — claude-society-app
**Agente:** agente-dba-database
**Data:** 2026-05-29
**Atualizado:** 2026-05-30
**Status:** Aguardando GATE 3B (aprovacao humana)

---

## 1. Contexto Lido

### Fontes consultadas
- `docs/arquitetura/estado.md` — GATE 2C aprovado em 2026-05-29; FASE 3B em andamento
- `docs/arquitetura/arquitetura-database-imp.md` — fonte de verdade da arquitetura database
- `docs/arquitetura/arquitetura-geral.md` — infraestrutura e servicos Docker

### Estado atual do repositorio
- `database/init/` — NAO EXISTE (sera criada)
- `database/setup/` — JA EXISTE com scripts SQL do agente-implementador-database (NAO TOCAR)
- `.env` — NAO COMMITADO; criado manualmente pelo humano antes de subir o banco

### Separacao de pastas (obrigatoria)
| Pasta | Responsavel | Conteudo | Montagem Docker |
|-------|-------------|---------|----------------|
| `database/init/` | agente-dba-database (este agente) | database, users, grants | `./database/init:/docker-entrypoint-initdb.d:ro` |
| `database/setup/` | agente-implementador-database | tabelas, DDL de schema | executado manualmente pelo humano apos GATE 3B-EXEC |

---

## 2. Nomes Derivados do Projeto

| Recurso | Nome |
|---------|------|
| Database MySQL | `claude_society_db` |
| Usuario MySQL (app) | `claude_society_user` |

---

## 3. Artefatos que Serao Criados

### 3.1 `database/init/01_database.sql`

Executado automaticamente pelo MySQL na primeira inicializacao do container, via
`docker-entrypoint-initdb.d`. Garante que o database existe com o charset correto.

**Conteudo completo:**

```sql
-- 01_database.sql
-- Cria o database da aplicacao com charset e collation adequados.
-- Executado automaticamente na inicializacao do container MySQL.

CREATE DATABASE IF NOT EXISTS `claude_society_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

### 3.2 `database/init/02_users.sql`

O MySQL Docker image ja cria o usuario automaticamente via `MYSQL_USER`/`MYSQL_PASSWORD`
lidos do `.env`. Este script serve como salvaguarda idempotente.

**Conteudo completo:**

```sql
-- 02_users.sql
-- Garante a existencia do usuario da aplicacao.
-- O MySQL Docker image ja cria este usuario via MYSQL_USER/MYSQL_PASSWORD
-- lidos do .env. Este script e uma salvaguarda idempotente.

CREATE USER IF NOT EXISTS 'claude_society_user'@'%'
  IDENTIFIED BY '${MYSQL_PASSWORD}';
```

**Nota tecnica:** O MySQL Docker image (mysql:8.0) processa os scripts de
`docker-entrypoint-initdb.d` apos configurar o usuario via `MYSQL_USER`/`MYSQL_PASSWORD`.
A variavel `MYSQL_PASSWORD` e resolvida pelo entrypoint do container antes de executar
os scripts SQL. O usuario `claude_society_user` ja e criado automaticamente pelo entrypoint;
este script garante idempotencia.

---

### 3.3 `database/init/03_grants.sql`

Concede apenas as permissoes necessarias para o usuario da aplicacao. O usuario
NAO recebe permissoes de DDL (CREATE TABLE, DROP, ALTER) — essas sao responsabilidade
do root durante a execucao manual dos scripts de setup.

**Conteudo completo:**

```sql
-- 03_grants.sql
-- Concede permissoes DML ao usuario da aplicacao.
-- O usuario da aplicacao recebe apenas: SELECT, INSERT, UPDATE, DELETE.
-- Permissoes DDL (CREATE, DROP, ALTER) sao exclusivas do root.
-- Executado automaticamente na inicializacao do container MySQL.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `claude_society_db`.* TO 'claude_society_user'@'%';

FLUSH PRIVILEGES;
```

---

### 3.4 `database/dba-setup.md`

Documento operacional para o humano com instrucoes de verificacao pos-init.

**Conteudo completo:**

```markdown
# DBA Setup — claude-society-app

Documento de operacao da infraestrutura do banco de dados.
Criado pelo agente-dba-database em 2026-05-30.

---

## O que foi configurado

| Recurso | Valor |
|---------|-------|
| Database | claude_society_db |
| Usuario (app) | claude_society_user |
| Permissoes do usuario | SELECT, INSERT, UPDATE, DELETE |
| Charset | utf8mb4 / utf8mb4_unicode_ci |

Nota: o container Docker (imagem, network, volume) e responsabilidade do agente-infra.
Este documento cobre apenas a verificacao dos recursos de banco criados pelos scripts
de `database/init/`.

---

## PRE-REQUISITO: arquivo .env

As credenciais do banco sao fornecidas pelo arquivo `.env` na raiz do projeto.
Este arquivo NUNCA e commitado no repositorio.

O `.env` deve conter ao menos:

```
MYSQL_ROOT_PASSWORD=sua-senha-root-aqui
MYSQL_DATABASE=claude_society_db
MYSQL_USER=claude_society_user
MYSQL_PASSWORD=sua-senha-app-aqui
DATABASE_URL=mysql://claude_society_user:sua-senha-app-aqui@db:3306/claude_society_db
```

Substitua `sua-senha-root-aqui` e `sua-senha-app-aqui` por senhas reais antes de salvar.

---

## Subir o banco

O container MySQL e gerenciado pelo agente-infra via docker-compose.yml.
Apos o agente-infra criar e disponibilizar o compose, execute:

```bash
docker compose up -d db
```

---

## Verificar saude do container

```bash
docker compose ps db
```

Aguardar o status `healthy` na coluna STATUS. Pode demorar ate 60 segundos na
primeira inicializacao (criacao do volume e execucao dos scripts de init).

---

## Verificar conexao como usuario da aplicacao

```bash
docker exec -it claude-society-app-db \
  mysql -u claude_society_user -p claude_society_db
```

Informe a senha definida em `MYSQL_PASSWORD` no `.env` quando solicitado.

Dentro do MySQL, verifique:

```sql
SHOW DATABASES;
-- deve listar claude_society_db

SELECT USER(), DATABASE();
-- deve retornar: claude_society_user@%, claude_society_db
```

---

## Verificar grants do usuario

Conecte como root:

```bash
docker exec -it claude-society-app-db \
  mysql -u root -p
```

Informe a senha de `MYSQL_ROOT_PASSWORD` definida no `.env`.

```sql
SHOW GRANTS FOR 'claude_society_user'@'%';
```

Resultado esperado:
```
GRANT USAGE ON *.* TO `claude_society_user`@`%`
GRANT SELECT, INSERT, UPDATE, DELETE ON `claude_society_db`.* TO `claude_society_user`@`%`
```

---

## Verificar logs de inicializacao

```bash
docker compose logs db
```

Deve aparecer a linha:
```
[Entrypoint] MySQL init process done. Ready for start up.
```

---

## O que reportar ao agente apos execucao

Apos executar e verificar, reporte:

1. Status do container: `docker compose ps db` — coluna STATUS deve ser `healthy`
2. Conexao como app user: sucesso ou erro
3. Grants verificados: corretos ou nao
4. Qualquer mensagem de erro nos logs

---

## Proximo passo (apos banco saudavel)

Com o banco de pe e saudavel (GATE 3B-EXEC aprovado), o
agente-implementador-database (FASE 4C) pode ser acionado para executar os scripts de
schema em `database/setup/` conforme `database/setup/execution-order.md`.
```

---

## 4. O que NAO sera criado e por que

| Item | Motivo |
|------|--------|
| `docker-compose.yml` | Responsabilidade exclusiva do agente-infra |
| Networks Docker | Responsabilidade exclusiva do agente-infra |
| Volumes Docker | Responsabilidade exclusiva do agente-infra |
| Bloco `secrets:` no Compose | Responsabilidade exclusiva do agente-infra |
| Tabelas, indices, procedures | Responsabilidade do agente-implementador-database (FASE 4C — database/setup/) |
| Service `app` no Compose | Responsabilidade do agente-implementador-frontend |
| Services `traefik`, `prometheus`, `grafana` | Responsabilidade de agentes dedicados |
| Dados de seed | Responsabilidade do Prisma seed (prisma/seed.ts) |
| Arquivo `.env` preenchido | Criado manualmente pelo humano; nunca commitado |

---

## 5. Instrucoes de Execucao para o Humano (GATE 3B-EXEC)

Apos aprovacao deste plano (GATE 3B), os artefatos serao criados e um PR draft
sera aberto. Para executar:

1. Garantir que o agente-infra ja criou e disponibilizou o `docker-compose.yml` com o service `db`
2. Criar o arquivo `.env` na raiz conforme instrucoes em `database/dba-setup.md`
3. Executar: `docker compose up -d db`
4. Aguardar status `healthy`: `docker compose ps db`
5. Verificar conexao e grants conforme `database/dba-setup.md`
6. Reportar resultado ao agente

---

## 6. Checklist de Verificacao Pos-Setup

- [ ] Arquivo `.env` criado com todas as variaveis obrigatorias
- [ ] `docker compose ps db` mostra status `healthy`
- [ ] Conexao como `claude_society_user` funciona no database `claude_society_db`
- [ ] `SHOW GRANTS FOR 'claude_society_user'@'%'` mostra SELECT, INSERT, UPDATE, DELETE
- [ ] `SHOW DATABASES` mostra `claude_society_db` com `claude_society_user`
- [ ] Logs do container nao mostram erros

---

## 7. Ordem de Execucao dos Scripts de Init

O MySQL executa os scripts de `docker-entrypoint-initdb.d` em ordem alfabetica
na primeira inicializacao do container (quando o volume esta vazio).

| Ordem | Arquivo | Acao |
|-------|---------|------|
| 1 | `01_database.sql` | Cria o database `claude_society_db` |
| 2 | `02_users.sql` | Garante existencia do usuario `claude_society_user` (salvaguarda) |
| 3 | `03_grants.sql` | Concede permissoes DML ao usuario |

Nota: o MySQL Docker image ja cria automaticamente o database (`MYSQL_DATABASE`) e o
usuario (`MYSQL_USER`) via entrypoint antes de executar os scripts de init. Os scripts
servem como idempotencia e garantia de charset/collation corretos.
