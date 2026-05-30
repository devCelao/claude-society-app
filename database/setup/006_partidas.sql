-- 006_partidas.sql
-- Tabela: partidas
-- Depende de: dias_de_jogo (003), times (004)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `partidas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `partidas` ADD COLUMN `dia_de_jogo_id` INT  NOT NULL;
ALTER TABLE `partidas` ADD COLUMN `time_a_id`      INT  NOT NULL;
ALTER TABLE `partidas` ADD COLUMN `time_b_id`      INT  NOT NULL;
ALTER TABLE `partidas` ADD COLUMN `vencedor_id`    INT  NULL;
ALTER TABLE `partidas` ADD COLUMN `status`         ENUM('AGUARDANDO','EM_ANDAMENTO','FINALIZADA') NOT NULL DEFAULT 'AGUARDANDO';
ALTER TABLE `partidas` ADD COLUMN `inicio_em`      DATETIME NULL;
ALTER TABLE `partidas` ADD COLUMN `fim_em`         DATETIME NULL;
ALTER TABLE `partidas` ADD COLUMN `ordem`          INT  NOT NULL;
ALTER TABLE `partidas` ADD COLUMN `criado_em`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indices
CREATE INDEX `idx_partidas_dia_de_jogo_id` ON `partidas` (`dia_de_jogo_id`);

-- FKs
ALTER TABLE `partidas`
  ADD CONSTRAINT `fk_partidas_dia_de_jogo`
  FOREIGN KEY (`dia_de_jogo_id`) REFERENCES `dias_de_jogo` (`id`) ON DELETE RESTRICT;

ALTER TABLE `partidas`
  ADD CONSTRAINT `fk_partidas_time_a`
  FOREIGN KEY (`time_a_id`) REFERENCES `times` (`id`) ON DELETE RESTRICT;

ALTER TABLE `partidas`
  ADD CONSTRAINT `fk_partidas_time_b`
  FOREIGN KEY (`time_b_id`) REFERENCES `times` (`id`) ON DELETE RESTRICT;

ALTER TABLE `partidas`
  ADD CONSTRAINT `fk_partidas_vencedor`
  FOREIGN KEY (`vencedor_id`) REFERENCES `times` (`id`) ON DELETE RESTRICT;
