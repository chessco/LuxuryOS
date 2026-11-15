-- Additive Dual Credit Management (30-day Revolving + Non-Revolving per deal/piece).
ALTER TABLE `CommerceSale`
    ADD COLUMN `creditedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE `CreditAccount` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `subjectType` ENUM('RESELLER', 'CLIENT') NOT NULL,
    `resellerId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `revolvingLimit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `revolvingUsed` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `defaultTermDays` INTEGER NOT NULL DEFAULT 30,
    `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CreditAccount_resellerId_key`(`resellerId`),
    UNIQUE INDEX `CreditAccount_clientId_key`(`clientId`),
    INDEX `CreditAccount_tenantId_subjectType_status_idx`(`tenantId`, `subjectType`, `status`),
    UNIQUE INDEX `CreditAccount_tenantId_resellerId_key`(`tenantId`, `resellerId`),
    UNIQUE INDEX `CreditAccount_tenantId_clientId_key`(`tenantId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CreditObligation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NULL,
    `facilityType` ENUM('REVOLVING', 'NON_REVOLVING') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'MXN',
    `principalAmount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balanceDue` DECIMAL(12, 2) NOT NULL,
    `termDays` INTEGER NOT NULL DEFAULT 30,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueAt` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `notes` TEXT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditObligation_tenantId_status_dueAt_idx`(`tenantId`, `status`, `dueAt`),
    INDEX `CreditObligation_accountId_facilityType_status_idx`(`accountId`, `facilityType`, `status`),
    INDEX `CreditObligation_saleId_idx`(`saleId`),
    UNIQUE INDEX `CreditObligation_tenantId_idempotencyKey_key`(`tenantId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CreditPayment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `obligationId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `recordedById` VARCHAR(191) NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditPayment_obligationId_recordedAt_idx`(`obligationId`, `recordedAt`),
    UNIQUE INDEX `CreditPayment_tenantId_idempotencyKey_key`(`tenantId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CreditLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `obligationId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `type` ENUM('LIMIT_UPDATED', 'DRAWDOWN', 'PAYMENT', 'CANCELLED') NOT NULL,
    `facilityType` ENUM('REVOLVING', 'NON_REVOLVING') NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `balanceAfter` DECIMAL(12, 2) NOT NULL,
    `revolvingUsedAfter` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditLedgerEntry_tenantId_accountId_createdAt_idx`(`tenantId`, `accountId`, `createdAt`),
    INDEX `CreditLedgerEntry_obligationId_idx`(`obligationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CreditAccount`
    ADD CONSTRAINT `CreditAccount_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditAccount_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditAccount_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CreditObligation`
    ADD CONSTRAINT `CreditObligation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditObligation_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `CreditAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditObligation_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `CommerceSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditObligation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CreditPayment`
    ADD CONSTRAINT `CreditPayment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditPayment_obligationId_fkey` FOREIGN KEY (`obligationId`) REFERENCES `CreditObligation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditPayment_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CreditLedgerEntry`
    ADD CONSTRAINT `CreditLedgerEntry_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditLedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `CreditAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditLedgerEntry_obligationId_fkey` FOREIGN KEY (`obligationId`) REFERENCES `CreditObligation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `CreditLedgerEntry_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
