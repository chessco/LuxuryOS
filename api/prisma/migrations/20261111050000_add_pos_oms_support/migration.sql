-- Additive POS/OMS support. Apply only through `prisma migrate deploy` after backup and staging validation.
ALTER TABLE `CommerceSale`
    MODIFY `paymentStatus` ENUM('PENDING', 'PARTIAL', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `CommercePayment`
    MODIFY `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `CommerceSale`
    ADD COLUMN `linkedOrderId` VARCHAR(191) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `cancellationReason` TEXT NULL;

DROP INDEX `CommerceSale_idempotencyKey_key` ON `CommerceSale`;
CREATE UNIQUE INDEX `CommerceSale_tenantId_idempotencyKey_key` ON `CommerceSale`(`tenantId`, `idempotencyKey`);
CREATE UNIQUE INDEX `CommerceSale_linkedOrderId_key` ON `CommerceSale`(`linkedOrderId`);

ALTER TABLE `CommerceSale`
    ADD CONSTRAINT `CommerceSale_linkedOrderId_fkey`
    FOREIGN KEY (`linkedOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `CommerceAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommerceAuditLog_tenantId_entityType_entityId_idx`(`tenantId`, `entityType`, `entityId`),
    INDEX `CommerceAuditLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `CommerceAuditLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommerceAuditLog`
    ADD CONSTRAINT `CommerceAuditLog_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CommerceAuditLog_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
