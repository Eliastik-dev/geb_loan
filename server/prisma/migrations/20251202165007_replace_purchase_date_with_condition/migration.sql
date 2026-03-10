-- AlterTable: Replace purchaseDate with condition
ALTER TABLE `Equipment` DROP COLUMN `purchaseDate`;
ALTER TABLE `Equipment` ADD COLUMN `condition` ENUM('NEW', 'GOOD', 'SLIGHT_WEAR', 'VISIBLE_WEAR', 'DAMAGED', 'LOST') NOT NULL DEFAULT 'GOOD';

