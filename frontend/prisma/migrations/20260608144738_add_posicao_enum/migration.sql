-- AlterTable: substituir coluna posicao (VARCHAR) por posicao_primaria e posicao_secundaria (ENUM)
ALTER TABLE `jogadores`
  DROP COLUMN `posicao`,
  ADD COLUMN `posicao_primaria` ENUM('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE', 'PONTA') NULL,
  ADD COLUMN `posicao_secundaria` ENUM('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE', 'PONTA') NULL;
