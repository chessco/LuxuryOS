-- Initialize each counter from the highest code ever retained for that tenant/type.
-- Existing duplicate codes are preserved; future codes continue after the maximum.
INSERT INTO `OrderNumberSequence` (`tenantId`, `type`, `currentValue`, `updatedAt`)
SELECT
  `tenantId`,
  `type`,
  COALESCE(MAX(CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(`specifications`, '$.orderCode')), '-', -1) AS UNSIGNED)), 0),
  CURRENT_TIMESTAMP(3)
FROM `Order`
WHERE JSON_UNQUOTE(JSON_EXTRACT(`specifications`, '$.orderCode')) REGEXP '^[A-Za-z]+-[0-9]+$'
GROUP BY `tenantId`, `type`
ON DUPLICATE KEY UPDATE
  `currentValue` = GREATEST(`OrderNumberSequence`.`currentValue`, VALUES(`currentValue`)),
  `updatedAt` = CURRENT_TIMESTAMP(3);
