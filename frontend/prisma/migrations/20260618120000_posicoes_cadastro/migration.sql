-- Cadastro de posicoes: migra o enum PosicaoJogador para a tabela `posicoes`
-- preservando os dados existentes dos jogadores (backfill enum -> FK).

-- 1) Nova tabela de posicoes
CREATE TABLE `posicoes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(50) NOT NULL,
  `sigla` VARCHAR(5) NOT NULL,
  `cor` VARCHAR(9) NOT NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT true,
  `ordem` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `posicoes_nome_key`(`nome`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) Semear as 7 posicoes atuais (sigla/cor herdadas do que era hardcoded no front)
INSERT INTO `posicoes` (`nome`, `sigla`, `cor`, `ativo`, `ordem`, `updated_at`) VALUES
  ('Goleiro',  'GOL', '#f5c400', true, 1, CURRENT_TIMESTAMP(3)),
  ('Zagueiro', 'ZAG', '#60a5fa', true, 2, CURRENT_TIMESTAMP(3)),
  ('Lateral',  'LAT', '#67e8f9', true, 3, CURRENT_TIMESTAMP(3)),
  ('Volante',  'VOL', '#c084fc', true, 4, CURRENT_TIMESTAMP(3)),
  ('Meia',     'MEI', '#a78bfa', true, 5, CURRENT_TIMESTAMP(3)),
  ('Atacante', 'ATA', '#fb923c', true, 6, CURRENT_TIMESTAMP(3)),
  ('Ponta',    'PON', '#f87171', true, 7, CURRENT_TIMESTAMP(3));

-- 3) Novas colunas FK (nullable) em jogadores
ALTER TABLE `jogadores`
  ADD COLUMN `posicao_primaria_id` INTEGER NULL,
  ADD COLUMN `posicao_secundaria_id` INTEGER NULL;

-- 4) Backfill: enum antigo -> id da posicao correspondente
UPDATE `jogadores` j
  JOIN `posicoes` p ON p.`nome` = CASE j.`posicao_primaria`
    WHEN 'GOLEIRO'  THEN 'Goleiro'
    WHEN 'ZAGUEIRO' THEN 'Zagueiro'
    WHEN 'LATERAL'  THEN 'Lateral'
    WHEN 'VOLANTE'  THEN 'Volante'
    WHEN 'MEIA'     THEN 'Meia'
    WHEN 'ATACANTE' THEN 'Atacante'
    WHEN 'PONTA'    THEN 'Ponta'
  END
SET j.`posicao_primaria_id` = p.`id`
WHERE j.`posicao_primaria` IS NOT NULL;

UPDATE `jogadores` j
  JOIN `posicoes` p ON p.`nome` = CASE j.`posicao_secundaria`
    WHEN 'GOLEIRO'  THEN 'Goleiro'
    WHEN 'ZAGUEIRO' THEN 'Zagueiro'
    WHEN 'LATERAL'  THEN 'Lateral'
    WHEN 'VOLANTE'  THEN 'Volante'
    WHEN 'MEIA'     THEN 'Meia'
    WHEN 'ATACANTE' THEN 'Atacante'
    WHEN 'PONTA'    THEN 'Ponta'
  END
SET j.`posicao_secundaria_id` = p.`id`
WHERE j.`posicao_secundaria` IS NOT NULL;

-- 5) Remover as colunas enum antigas
ALTER TABLE `jogadores`
  DROP COLUMN `posicao_primaria`,
  DROP COLUMN `posicao_secundaria`;

-- 6) Indices e FKs
CREATE INDEX `jogadores_posicao_primaria_id_idx` ON `jogadores`(`posicao_primaria_id`);
CREATE INDEX `jogadores_posicao_secundaria_id_idx` ON `jogadores`(`posicao_secundaria_id`);

ALTER TABLE `jogadores`
  ADD CONSTRAINT `jogadores_posicao_primaria_id_fkey`
    FOREIGN KEY (`posicao_primaria_id`) REFERENCES `posicoes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `jogadores_posicao_secundaria_id_fkey`
    FOREIGN KEY (`posicao_secundaria_id`) REFERENCES `posicoes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
