/*
  Warnings:

  - You are about to drop the column `sentAt` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `QueueTicket` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `QueueTicket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dedupeKey]` on the table `NotificationLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrToken]` on the table `QueueTicket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channel` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateKey` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kind` to the `QueueTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qrToken` to the `QueueTicket` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `QueueTicket_token_idx` ON `QueueTicket`;

-- DropIndex
DROP INDEX `QueueTicket_token_key` ON `QueueTicket`;

-- AlterTable
ALTER TABLE `NotificationLog` DROP COLUMN `sentAt`,
    DROP COLUMN `template`,
    DROP COLUMN `type`,
    ADD COLUMN `channel` VARCHAR(191) NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `dedupeKey` VARCHAR(191) NULL,
    ADD COLUMN `providerMessageId` VARCHAR(191) NULL,
    ADD COLUMN `templateKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL,
    ADD COLUMN `to` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `QueueEvent` MODIFY `fromStatus` ENUM('WAITING', 'CALLING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NULL,
    MODIFY `toStatus` ENUM('WAITING', 'CALLING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NOT NULL;

-- AlterTable
ALTER TABLE `QueueTicket` DROP COLUMN `token`,
    DROP COLUMN `type`,
    ADD COLUMN `kind` ENUM('REPAIR', 'SALE', 'PICKUP') NOT NULL,
    ADD COLUMN `qrToken` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('WAITING', 'CALLING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NOT NULL DEFAULT 'WAITING';

-- CreateTable
CREATE TABLE `QueueRecommendation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `kind` ENUM('REPAIR', 'SALE', 'PICKUP') NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `QueueRecommendation_tenantId_kind_isActive_idx`(`tenantId`, `kind`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueTicketRecommendation` (
    `ticketId` VARCHAR(191) NOT NULL,
    `recommendationId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,

    PRIMARY KEY (`ticketId`, `recommendationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `NotificationLog_dedupeKey_key` ON `NotificationLog`(`dedupeKey`);

-- CreateIndex
CREATE UNIQUE INDEX `QueueTicket_qrToken_key` ON `QueueTicket`(`qrToken`);

-- CreateIndex
CREATE INDEX `QueueTicket_qrToken_idx` ON `QueueTicket`(`qrToken`);

-- AddForeignKey
ALTER TABLE `QueueRecommendation` ADD CONSTRAINT `QueueRecommendation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueTicketRecommendation` ADD CONSTRAINT `QueueTicketRecommendation_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `QueueTicket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueTicketRecommendation` ADD CONSTRAINT `QueueTicketRecommendation_recommendationId_fkey` FOREIGN KEY (`recommendationId`) REFERENCES `QueueRecommendation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationLog` ADD CONSTRAINT `NotificationLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
