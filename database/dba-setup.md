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

## Verificar logs de inicializacao

```bash
docker compose logs db
```

Deve aparecer a linha:

```
[Entrypoint] MySQL init process done. Ready for start up.
```

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

## O que reportar ao agente apos execucao

Apos executar e verificar, reporte ao agente-dba-database:

1. Status do container: `docker compose ps db` — coluna STATUS deve ser `healthy`
2. Conexao como app user: sucesso ou erro
3. Grants verificados: corretos ou nao
4. Qualquer mensagem de erro nos logs

---

## Proximo passo (apos banco saudavel)

Com o banco de pe e saudavel (GATE 3B-EXEC aprovado), o
agente-implementador-database (FASE 4C) pode ser acionado para executar os scripts de
schema em `database/setup/` conforme `database/setup/execution-order.md`.
