-- 003_dias_de_jogo.sql
-- Tabela: dias_de_jogo
-- Depende de: ciclos (002)
-- Criado: 2026-05-30

-- ENUM de status (idempotente: ignora se ja existir)
-- MySQL nao tem CREATE TYPE IF NOT EXISTS; o ENUM e definido na coluna diretamente.

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `dias_de_jogo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `dias_de_jogo` ADD COLUMN `ciclo_id` INT          NOT NULL;
ALTER TABLE `dias_de_jogo` ADD COLUMN `data`     DATE         NOT NULL;
ALTER TABLE `dias_de_jogo` ADD COLUMN `status`   ENUM('PENDENTE','EM_ANDAMENTO','FINALIZADO') NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE `dias_de_jogo` ADD COLUMN `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indices
CREATE INDEX `idx_dias_de_jogo_ciclo_id` ON `dias_de_jogo` (`ciclo_id`);

CREATE INDEX `idx_dias_de_jogo_data` ON `dias_de_jogo` (`data`);

-- FKs
ALTER TABLE `dias_de_jogo`
  ADD CONSTRAINT `fk_dias_de_jogo_ciclo`
  FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos` (`id`) ON DELETE RESTRICT;
