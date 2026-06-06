-- 03_grants.sql
-- Concede permissoes DML ao usuario da aplicacao.
-- O usuario da aplicacao recebe apenas: SELECT, INSERT, UPDATE, DELETE.
-- Permissoes DDL (CREATE, DROP, ALTER) sao exclusivas do root.
-- Executado automaticamente na inicializacao do container MySQL
-- via docker-entrypoint-initdb.d (responsabilidade de montagem: agente-infra).

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `peladadb`.* TO 'serviceapp'@'%';

FLUSH PRIVILEGES;
