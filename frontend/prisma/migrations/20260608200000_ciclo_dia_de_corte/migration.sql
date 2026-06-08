-- Adiciona dia_de_corte em ciclos e refatora configuracao_jogos

ALTER TABLE `ciclos`
  ADD COLUMN `dia_de_corte` INT NULL AFTER `nome`;

UPDATE `ciclos` SET `dia_de_corte` = DAY(`inicio_em`);

ALTER TABLE `configuracao_jogos`
  DROP COLUMN `corte_inicio`,
  DROP COLUMN `corte_fim`,
  ADD COLUMN `dia_de_corte` INT NULL;
