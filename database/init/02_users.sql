-- 02_users.sql
-- Garante a existencia do usuario da aplicacao.
-- O MySQL Docker image ja cria este usuario via MYSQL_USER/MYSQL_PASSWORD
-- lidos do .env. Este script e uma salvaguarda idempotente.
-- Executado automaticamente na inicializacao do container MySQL
-- via docker-entrypoint-initdb.d (responsabilidade de montagem: agente-infra).

CREATE USER IF NOT EXISTS 'claude_society_user'@'%'
  IDENTIFIED BY '${MYSQL_PASSWORD}';
