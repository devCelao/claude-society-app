-- 001_jogadores.sql
-- Tabela: jogadores
-- Depende de: (nenhuma)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `jogadores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `jogadores` ADD COLUMN `nome`      VARCHAR(100) NOT NULL;
ALTER TABLE `jogadores` ADD COLUMN `apelido`   VARCHAR(60)  NULL;
ALTER TABLE `jogadores` ADD COLUMN `convidado` TINYINT(1)   NOT NULL DEFAULT 0;
ALTER TABLE `jogadores` ADD COLUMN `deleted_at`    DATETIME NULL;
ALTER TABLE `jogadores` ADD COLUMN `criado_em`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `jogadores` ADD COLUMN `atualizado_em` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP;

-- Indices
CREATE INDEX `idx_jogadores_deleted_at` ON `jogadores` (`deleted_at`);
