/*
  Warnings:

  - You are about to drop the column `queueTicketId` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `QueueTicket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_queueTicketId_fkey`;

-- DropIndex
DROP INDEX `Order_queueTicketId_key` ON `Order`;

-- AlterTable
ALTER TABLE `Order` DROP COLUMN `queueTicketId`;

-- AlterTable
ALTER TABLE `QueueTicket` ADD COLUMN `orderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `QueueTicket_orderId_key` ON `QueueTicket`(`orderId`);

-- AddForeignKey
ALTER TABLE `QueueTicket` ADD CONSTRAINT `QueueTicket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
