-- 01_database.sql
-- Cria o database da aplicacao com charset e collation adequados.
-- Executado automaticamente na inicializacao do container MySQL
-- via docker-entrypoint-initdb.d (responsabilidade de montagem: agente-infra).

CREATE DATABASE IF NOT EXISTS `claude_society_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
