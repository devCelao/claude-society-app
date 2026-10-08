-- Gol contra: conta no placar do time beneficiado, mas nao na artilharia do jogador
ALTER TABLE `gols` ADD COLUMN `gol_contra` BOOLEAN NOT NULL DEFAULT false;
