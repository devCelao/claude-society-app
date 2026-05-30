# Infra Implementation Plan — claude-society-app
**Agente:** agente-infra
**Data:** 2026-05-30
**Status:** Aguardando GATE 3A (aprovacao humana)

---

## 1. Contexto Lido

### Fontes consultadas
- `docs/arquitetura/estado.md` — GATE 1 aprovado; FASE 3A pendente; FASE 3B aprovada e em andamento
- `docs/arquitetura/arquitetura-geral.md` — fonte de verdade dos services e da rede
- `docs/arquitetura/dba-imp.md` — artefatos do agente-dba (database/init/ + nomes confirmados)

### Estado atual do repositorio
- `docker-compose.yml` — NAO EXISTE (sera criado)
- `.gitignore` — JA EXISTE (nao sera sobrescrito)
- `database/init/` — criada pelo agente-dba-database (FASE 3B)
- `.env` — NAO COMMITADO; criado manualmente pelo humano antes de subir containers

### Monitoramento
Prometheus e Grafana descartados — nao ha necessidade de monitoramento neste projeto.

---

## 2. Servicos Opcionais

Marque os servicos desejados para este projeto:

**Observabilidade**
- [ ] Prometheus — coleta de metricas da aplicacao
- [ ] Grafana — visualizacao de metricas (requer Prometheus)

**Mensageria**
- [ ] RabbitMQ — broker de mensagens assincronas

**Cache**
- [ ] Redis — cache e/ou armazenamento de sessao

**Banco de dados auxiliar**
- [ ] phpMyAdmin — interface web para o MySQL (somente dev)

**Email (dev)**
- [ ] MailPit — captura de emails em desenvolvimento

> Nenhum servico opcional selecionado para este projeto.

---

## 3. Tipo de Projeto

**Monolito simples** — um unico `docker-compose.yml` na raiz com todos os services.

Tres services: traefik, app, db.

---

## 4. Nomes Derivados do Projeto

| Recurso | Nome |
|---------|------|
| Network | `claude_society_net` |
| Volume MySQL | `claude_society_mysql_data` |
| Container Traefik | `claude-society-app-traefik` |
| Container App | `claude-society-app-app` |
| Container DB | `claude-society-app-db` |

---

## 5. Services — Visao Geral

| Service | Imagem | Porta externa | Proposito |
|---------|--------|--------------|-----------|
| `traefik` | traefik:v3 | :80, :443 | Proxy reverso; unico ponto publico |
| `app` | build local (Dockerfile) | Nao — via Traefik | Monolito Next.js 14 |
| `db` | mysql:8.0 | Nao | Banco de dados relacional |

---

## 6. Estrutura de Arquivos que Sera Criada

```
d:\GIT_REPS\claude-society-app\
  docker-compose.yml          <- configuracao de producao
  docker-compose.local.yml    <- overrides de desenvolvimento
```

Artefatos NAO criados por este agente (responsabilidade de outros):
- `.gitignore` — ja existe
- `database/init/` — agente-dba-database (FASE 3B)
- `Dockerfile` — agente-implementador-frontend (FASE 4A)
- `prisma/schema.prisma` — agente-implementador-database (FASE 4C)
- `.env` preenchido — humano (nunca commitado)

---

## 7. Conteudo Exato de Cada Artefato

---

### 6.1 `docker-compose.yml`

```yaml
name: claude-society-app

services:

  # ---------------------------------------------------------------------------
  # Traefik — proxy reverso; unico servico com porta publica
  # ---------------------------------------------------------------------------
  traefik:
    image: traefik:v3
    container_name: claude-society-app-traefik
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--api.dashboard=false"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - claude_society_net
    restart: unless-stopped

  # ---------------------------------------------------------------------------
  # App — monolito Next.js 14
  # ---------------------------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: claude-society-app-app
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`${APP_DOMAIN}`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
    networks:
      - claude_society_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # ---------------------------------------------------------------------------
  # DB — MySQL 8.0
  # ---------------------------------------------------------------------------
  db:
    image: mysql:8.0
    container_name: claude-society-app-db
    env_file:
      - .env
    volumes:
      - claude_society_mysql_data:/var/lib/mysql
      - ./database/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$$MYSQL_ROOT_PASSWORD"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - claude_society_net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512m

# -------------------------------------------------------------------------
# Networks
# -------------------------------------------------------------------------
networks:
  claude_society_net:
    name: claude_society_net
    driver: bridge

# -------------------------------------------------------------------------
# Volumes
# -------------------------------------------------------------------------
volumes:
  claude_society_mysql_data:
```

---

### 6.2 `docker-compose.local.yml`

```yaml
# docker-compose.local.yml
# Overrides para desenvolvimento local
# Uso: docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
services:

  # Traefik: HTTP-only em dev, dashboard habilitado
  traefik:
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--api.dashboard=true"
      - "--api.insecure=true"
    ports:
      - "80:80"
      - "8080:8080"

  # App: labels trocam websecure -> web; porta direta exposta
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`localhost`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
    ports:
      - "3000:3000"

  # DB: porta exposta para ferramentas locais
  db:
    ports:
      - "3306:3306"
```

> Em dev: app via Traefik em `http://localhost`, direto em `http://localhost:3000`,
> dashboard Traefik em `http://localhost:8080`.

---

## 8. Variaveis Obrigatorias no `.env`

O humano deve criar o arquivo `.env` na raiz antes de subir os containers.
Este arquivo NUNCA e commitado.

```env
# ---------------------------------------------------------------------------
# MySQL
# ---------------------------------------------------------------------------
MYSQL_ROOT_PASSWORD=<senha-root-forte>
MYSQL_DATABASE=claude_society_db
MYSQL_USER=claude_society_user
MYSQL_PASSWORD=<senha-app-forte>

# ---------------------------------------------------------------------------
# App (Next.js)
# ---------------------------------------------------------------------------
DATABASE_URL=mysql://claude_society_user:<senha-app-forte>@db:3306/claude_society_db
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://<seu-dominio>
APP_DOMAIN=<seu-dominio>
```

Substituir todos os valores entre `<` e `>` por valores reais.

---

## 9. Notas de Implementacao

### App — Dockerfile
O service `app` usa `build: context: .` e espera um `Dockerfile` na raiz.
Esse Dockerfile sera criado pelo agente-implementador-frontend (FASE 4A).
Ate que o Dockerfile exista, o service `app` nao pode ser buildado — isso e esperado
e nao impede a subida dos demais services (db, traefik).

### database/init/
O volume `./database/init:/docker-entrypoint-initdb.d:ro` espera que a pasta
`database/init/` exista com os scripts do agente-dba-database.
Os scripts de init so rodam quando o volume MySQL esta vazio (primeira inicializacao).

### Traefik — TLS
O compose nao configura TLS automatico (Let's Encrypt) por ora — isso requer
`certificatesResolvers` e um dominio publico. Para desenvolvimento local,
o Traefik opera em HTTP na porta 80.
Para producao com TLS, adicionar ao comando do Traefik:
```
- "--certificatesresolvers.letsencrypt.acme.email=<email>"
- "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
- "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```
e montar o volume de certificados.

---

## 10. Comandos de Verificacao Pos-Subida

```bash
# 1. Subir services de infra (app precisa do Dockerfile — criado na FASE 4A)
docker compose up -d traefik db

# 2. Verificar status e saude
docker compose ps

# 3. Verificar logs do banco (aguardar "ready for connections")
docker compose logs db

# 4. Verificar rede criada
docker network ls | grep claude_society_net

# 5. Verificar volumes criados
docker volume ls | grep claude_society
```

Resultado esperado de `docker compose ps` (com o local):
```
NAME                          STATUS
claude-society-app-traefik    running
claude-society-app-db         healthy
```

> Em dev, usar sempre com o local:
> `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d traefik db`

---

## 11. O que NAO sera criado e por que

| Item | Motivo |
|------|--------|
| `Dockerfile` | Responsabilidade do agente-implementador-frontend (FASE 4A) |
| `database/init/*.sql` | Responsabilidade do agente-dba-database (FASE 3B) — ja criado |
| `prisma/schema.prisma` | Responsabilidade do agente-implementador-database (FASE 4C) |
| `.env` preenchido | Criado manualmente pelo humano; nunca commitado |
| Prometheus + Grafana | Descartados — monitoramento nao necessario para este projeto |
| `traefik/` com certificados | Requer dominio publico; configurado em producao pelo humano |

---

## 12. Instrucoes para o Humano (GATE 3A-EXEC)

Apos aprovacao deste plano (GATE 3A) e criacao dos artefatos:

1. Criar `.env` na raiz com todas as variaveis da secao 7
2. Garantir que `database/init/` existe (agente-dba-database deve ter entregado GATE 3B)
3. Subir os services de infra (com overrides locais):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.local.yml up -d traefik db
   ```
4. Aguardar o db ficar `healthy`:
   ```bash
   docker compose ps
   ```
5. Verificar logs do banco:
   ```bash
   docker compose logs db
   ```
6. Confirmar que os containers estao `running` ou `healthy`
7. Reportar sucesso ou erro ao agente

O service `app` so pode ser subido apos o Dockerfile existir (FASE 4A concluida).
