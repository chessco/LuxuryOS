-- Financial credit notes reduce an obligation balance and are immutable audit records.
ALTER TABLE `CreditLedgerEntry`
  MODIFY `type` ENUM('LIMIT_UPDATED', 'DRAWDOWN', 'PAYMENT', 'CREDIT_NOTE', 'CANCELLED') NOT NULL;

CREATE TABLE `CreditNote` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `obligationId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `notes` TEXT NULL,
  `recordedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `CreditNote_tenantId_obligationId_createdAt_idx` (`tenantId`, `obligationId`, `createdAt`),
  CONSTRAINT `CreditNote_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CreditNote_obligationId_fkey` FOREIGN KEY (`obligationId`) REFERENCES `CreditObligation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CreditNote_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
