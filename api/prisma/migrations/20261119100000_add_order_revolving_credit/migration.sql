-- Allow revolving-credit obligations to be linked to workshop/store orders.
ALTER TABLE `CreditObligation`
  ADD COLUMN `orderId` VARCHAR(191) NULL;

CREATE INDEX `CreditObligation_orderId_idx` ON `CreditObligation`(`orderId`);

ALTER TABLE `CreditObligation`
  ADD CONSTRAINT `CreditObligation_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
