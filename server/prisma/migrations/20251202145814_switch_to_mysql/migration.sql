-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `hireDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EquipmentType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Equipment` (
    `id` VARCHAR(191) NOT NULL,
    `serialNumber` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `typeId` VARCHAR(191) NOT NULL,
    `currentStatus` ENUM('AVAILABLE', 'ON_LOAN', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    `purchaseDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Equipment_serialNumber_key`(`serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Loan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `validationCode` VARCHAR(191) NOT NULL,
    `checkoutDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `checkoutNotes` VARCHAR(191) NULL,
    `checkoutITStaff` VARCHAR(191) NOT NULL,
    `returnITStaff` VARCHAR(191) NULL,
    `checkoutValidated` BOOLEAN NOT NULL DEFAULT false,
    `returnValidated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoanItem` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `conditionOut` ENUM('NEW', 'GOOD', 'SLIGHT_WEAR', 'VISIBLE_WEAR', 'DAMAGED', 'LOST') NOT NULL,
    `conditionIn` ENUM('NEW', 'GOOD', 'SLIGHT_WEAR', 'VISIBLE_WEAR', 'DAMAGED', 'LOST') NULL,
    `returned` BOOLEAN NOT NULL DEFAULT false,
    `returnNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Equipment` ADD CONSTRAINT `Equipment_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `EquipmentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Loan` ADD CONSTRAINT `Loan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanItem` ADD CONSTRAINT `LoanItem_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `Loan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanItem` ADD CONSTRAINT `LoanItem_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
