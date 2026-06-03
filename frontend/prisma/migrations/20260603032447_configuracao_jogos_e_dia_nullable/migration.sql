-- DropForeignKey
ALTER TABLE `dias_de_jogo` DROP FOREIGN KEY `dias_de_jogo_ciclo_id_fkey`;

-- DropIndex
DROP INDEX `dias_de_jogo_ciclo_id_fkey` ON `dias_de_jogo`;

-- AlterTable
ALTER TABLE `dias_de_jogo` MODIFY `ciclo_id` INTEGER NULL,
    MODIFY `data` DATE NULL;

-- CreateTable
CREATE TABLE `configuracao_jogos` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `corte_inicio` DATE NULL,
    `corte_fim` DATE NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dias_de_jogo` ADD CONSTRAINT `dias_de_jogo_ciclo_id_fkey` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
