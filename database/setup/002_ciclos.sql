-- 002_ciclos.sql
-- Tabela: ciclos
-- Depende de: (nenhuma)
-- Criado: 2026-05-30

-- Criacao (estrutura minima com PK)
CREATE TABLE IF NOT EXISTS `ciclos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colunas base
ALTER TABLE `ciclos` ADD COLUMN `nome`      VARCHAR(100) NOT NULL;
ALTER TABLE `ciclos` ADD COLUMN `inicio_em` DATETIME     NOT NULL;
ALTER TABLE `ciclos` ADD COLUMN `fim_em`    DATETIME     NOT NULL;
ALTER TABLE `ciclos` ADD COLUMN `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
