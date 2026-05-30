-- 007_gols.sql
-- Tabela: gols
-- Depende de: partidas (006), jogadores (001)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `gols` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `gols` ADD COLUMN `partida_id`  INT      NOT NULL;
ALTER TABLE `gols` ADD COLUMN `time_id`     INT      NOT NULL;
ALTER TABLE `gols` ADD COLUMN `jogador_id`  INT      NOT NULL;
ALTER TABLE `gols` ADD COLUMN `marcado_em`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `gols` ADD COLUMN `atualizado_em` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP;

-- Indices
CREATE INDEX `idx_gols_partida_id` ON `gols` (`partida_id`);

CREATE INDEX `idx_gols_jogador_id` ON `gols` (`jogador_id`);

-- FKs
ALTER TABLE `gols`
  ADD CONSTRAINT `fk_gols_partida`
  FOREIGN KEY (`partida_id`) REFERENCES `partidas` (`id`) ON DELETE RESTRICT;

ALTER TABLE `gols`
  ADD CONSTRAINT `fk_gols_jogador`
  FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT;
