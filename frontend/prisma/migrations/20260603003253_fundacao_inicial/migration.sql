-- CreateTable
CREATE TABLE `jogadores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `apelido` VARCHAR(50) NULL,
    `posicao` VARCHAR(30) NULL,
    `convidado` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ciclos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `inicio_em` DATETIME(3) NOT NULL,
    `fim_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dias_de_jogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ciclo_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `status` ENUM('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADO') NOT NULL DEFAULT 'PENDENTE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dia_de_jogo_id` INTEGER NOT NULL,
    `nome` VARCHAR(20) NOT NULL,
    `cor` VARCHAR(30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jogador_time` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `time_id` INTEGER NOT NULL,
    `jogador_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `jogador_time_time_id_jogador_id_key`(`time_id`, `jogador_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partidas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dia_de_jogo_id` INTEGER NOT NULL,
    `time_a_id` INTEGER NOT NULL,
    `time_b_id` INTEGER NOT NULL,
    `status` ENUM('AGUARDANDO', 'EM_ANDAMENTO', 'FINALIZADA') NOT NULL DEFAULT 'AGUARDANDO',
    `inicio_em` DATETIME(3) NULL,
    `fim_em` DATETIME(3) NULL,
    `vencedor_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gols` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partida_id` INTEGER NOT NULL,
    `time_id` INTEGER NOT NULL,
    `jogador_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gol_id` INTEGER NOT NULL,
    `jogador_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `assistencias_gol_id_key`(`gol_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dias_de_jogo` ADD CONSTRAINT `dias_de_jogo_ciclo_id_fkey` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `times` ADD CONSTRAINT `times_dia_de_jogo_id_fkey` FOREIGN KEY (`dia_de_jogo_id`) REFERENCES `dias_de_jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jogador_time` ADD CONSTRAINT `jogador_time_time_id_fkey` FOREIGN KEY (`time_id`) REFERENCES `times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jogador_time` ADD CONSTRAINT `jogador_time_jogador_id_fkey` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_dia_de_jogo_id_fkey` FOREIGN KEY (`dia_de_jogo_id`) REFERENCES `dias_de_jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_time_a_id_fkey` FOREIGN KEY (`time_a_id`) REFERENCES `times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_time_b_id_fkey` FOREIGN KEY (`time_b_id`) REFERENCES `times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_vencedor_id_fkey` FOREIGN KEY (`vencedor_id`) REFERENCES `times`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gols` ADD CONSTRAINT `gols_partida_id_fkey` FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gols` ADD CONSTRAINT `gols_time_id_fkey` FOREIGN KEY (`time_id`) REFERENCES `times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gols` ADD CONSTRAINT `gols_jogador_id_fkey` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistencias` ADD CONSTRAINT `assistencias_gol_id_fkey` FOREIGN KEY (`gol_id`) REFERENCES `gols`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistencias` ADD CONSTRAINT `assistencias_jogador_id_fkey` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
