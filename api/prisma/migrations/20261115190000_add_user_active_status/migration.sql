-- Additive account revocation flag. Existing production users remain active.
ALTER TABLE `User`
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT TRUE;
