/*
  Warnings:

  - A unique constraint covering the columns `[queueTicketId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Order` ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `queueTicketId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `QueueTicket` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('REPAIR', 'SALE') NOT NULL,
    `status` ENUM('WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `code` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `token` VARCHAR(191) NOT NULL,
    `sequenceNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QueueTicket_token_key`(`token`),
    UNIQUE INDEX `QueueTicket_sequenceNumber_key`(`sequenceNumber`),
    INDEX `QueueTicket_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `QueueTicket_token_idx`(`token`),
    UNIQUE INDEX `QueueTicket_tenantId_sequenceNumber_key`(`tenantId`, `sequenceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueEvent` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NULL,
    `toStatus` ENUM('WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELLED') NOT NULL,
    `changedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationLog` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `template` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Order_queueTicketId_key` ON `Order`(`queueTicketId`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_queueTicketId_fkey` FOREIGN KEY (`queueTicketId`) REFERENCES `QueueTicket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueTicket` ADD CONSTRAINT `QueueTicket_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEvent` ADD CONSTRAINT `QueueEvent_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `QueueTicket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationLog` ADD CONSTRAINT `NotificationLog_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `QueueTicket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
