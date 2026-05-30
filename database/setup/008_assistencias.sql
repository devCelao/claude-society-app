-- 008_assistencias.sql
-- Tabela: assistencias
-- Depende de: gols (007), jogadores (001)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `assistencias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `assistencias` ADD COLUMN `gol_id`     INT NOT NULL;
ALTER TABLE `assistencias` ADD COLUMN `jogador_id` INT NOT NULL;
ALTER TABLE `assistencias` ADD COLUMN `criado_em`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indices
-- UNIQUE (gol_id) â€” maximo 1 assistencia por gol; serve como indice
CREATE UNIQUE INDEX `uq_assistencias_gol_id` ON `assistencias` (`gol_id`);

CREATE INDEX `idx_assistencias_jogador_id` ON `assistencias` (`jogador_id`);

-- FKs
-- gol_id: CASCADE â€” ao deletar o gol, a assistencia e removida automaticamente
ALTER TABLE `assistencias`
  ADD CONSTRAINT `fk_assistencias_gol`
  FOREIGN KEY (`gol_id`) REFERENCES `gols` (`id`) ON DELETE CASCADE;

ALTER TABLE `assistencias`
  ADD CONSTRAINT `fk_assistencias_jogador`
  FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT;
