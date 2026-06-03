ALTER TABLE `dias_de_jogo`
  ADD COLUMN `passo` VARCHAR(20) NOT NULL DEFAULT 'lista',
  ADD COLUMN `lista_jogador_ids` JSON NULL;
