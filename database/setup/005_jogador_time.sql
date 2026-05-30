-- 005_jogador_time.sql
-- Tabela: jogador_time
-- Depende de: jogadores (001), times (004)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `jogador_time` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `jogador_time` ADD COLUMN `time_id`    INT NOT NULL;
ALTER TABLE `jogador_time` ADD COLUMN `jogador_id` INT NOT NULL;

-- Indices
-- UNIQUE (time_id, jogador_id) â€” impede duplicata e serve como indice composto
CREATE UNIQUE INDEX `uq_jogador_time_time_jogador` ON `jogador_time` (`time_id`, `jogador_id`);

CREATE INDEX `idx_jogador_time_jogador_id` ON `jogador_time` (`jogador_id`);

-- FKs
ALTER TABLE `jogador_time`
  ADD CONSTRAINT `fk_jogador_time_time`
  FOREIGN KEY (`time_id`) REFERENCES `times` (`id`) ON DELETE RESTRICT;

ALTER TABLE `jogador_time`
  ADD CONSTRAINT `fk_jogador_time_jogador`
  FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT;
