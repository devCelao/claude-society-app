# claude-society-app

Gerenciamento de grupo de futebol society: jogadores, ciclos mensais, dias de jogo, partidas ao vivo e dashboard de estatísticas.

## Contexto

Aplicação para uso interno de um grupo fechado (~18 pessoas). Sem exposição pública. Autenticação gerenciada pelo Traefik (Basic Auth na borda).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 |
| ORM | Prisma 7 |
| Banco | MySQL 8.0 |
| Estilos | Tailwind CSS + shadcn/ui |
| Proxy | Traefik v3 |
| Containers | Docker + Docker Compose |

## Estrutura do Repositório

```
claude-society-app/
  frontend/          # Aplicação Next.js (src/, prisma/, package.json)
  database/
    init/            # Scripts de inicialização do banco (database, users, grants)
    setup/           # Scripts de schema (tabelas, índices, FKs)
  docs/
    arquitetura/     # Documentos de arquitetura e estado do fluxo
    padroes/         # Padrões de implementação por tipo de artefato
  docker-compose.yml
  docker-compose.override.yml  # Overrides de desenvolvimento (auto-carregado)
  .env               # Variáveis de ambiente (não commitado)
```

## Início Rápido

### Pré-requisitos

- Docker + Docker Compose
- Node.js 22+

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env  # editar com valores reais
```

Variáveis necessárias:

```env
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=claude_society_db
MYSQL_USER=claude_society_user
MYSQL_PASSWORD=
DATABASE_URL=mysql://claude_society_user:<senha>@db:3306/claude_society_db
NODE_ENV=development
APP_DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost
```

### 2. Subir infraestrutura

```bash
docker compose up -d
```

O `docker-compose.override.yml` é carregado automaticamente em desenvolvimento:
- Traefik sem TLS, dashboard em `http://localhost:8080`
- App acessível em `http://localhost:3000`
- MySQL com porta `3306` exposta para ferramentas locais

### 3. Inicializar banco

Após os containers subirem, executar os scripts de init:

```bash
# Ver instruções detalhadas em:
cat database/dba-setup.md
```

### 4. Desenvolvimento frontend

```bash
cd frontend
npm install
npm run dev
```

## Documentação

- **Arquitetura geral:** `docs/arquitetura/arquitetura-geral.md`
- **Arquitetura frontend:** `docs/arquitetura/arquitetura-frontend.md`
- **Arquitetura database:** `docs/arquitetura/arquitetura-database.md`
- **Estado do fluxo:** `docs/arquitetura/estado.md`
- **Padrões de implementação:** `docs/padroes/`
- **Governança e convenções:** `CLAUDE.md`
