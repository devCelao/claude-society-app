-- 004_times.sql
-- Tabela: times
-- Depende de: dias_de_jogo (003)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `times` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `times` ADD COLUMN `dia_de_jogo_id` INT         NOT NULL;
ALTER TABLE `times` ADD COLUMN `nome`           VARCHAR(60) NOT NULL;
ALTER TABLE `times` ADD COLUMN `cor`            VARCHAR(30) NULL;

-- Indices
CREATE INDEX `idx_times_dia_de_jogo_id` ON `times` (`dia_de_jogo_id`);

-- FKs
ALTER TABLE `times`
  ADD CONSTRAINT `fk_times_dia_de_jogo`
  FOREIGN KEY (`dia_de_jogo_id`) REFERENCES `dias_de_jogo` (`id`) ON DELETE RESTRICT;
