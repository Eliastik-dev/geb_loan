import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create equipment types
    const types = [
        { name: 'Laptop', description: 'Ordinateur portable' },
        { name: 'Tablet', description: 'Tablette' },
        { name: 'Smartphone', description: 'Téléphone portable' },
        { name: 'Charger', description: 'Chargeur' },
        { name: 'Bag', description: 'Sacoche' },
        { name: 'Printer', description: 'Imprimante' },
        { name: 'Monitor', description: 'Écran' },
        { name: 'Keyboard', description: 'Clavier' },
        { name: 'Mouse', description: 'Souris' },
        { name: 'Headset', description: 'Casque audio' },
    ];

    for (const type of types) {
        await prisma.equipmentType.upsert({
            where: { name: type.name },
            update: {},
            create: type,
        });
    }

    console.log('✅ Equipment types created');

    // Create some sample equipment
    const laptopType = await prisma.equipmentType.findUnique({
        where: { name: 'Laptop' },
    });

    if (laptopType) {
        await prisma.equipment.create({
            data: {
                serialNumber: 'LAPTOP-001',
                brand: 'Dell',
                model: 'Latitude 5520',
                typeId: laptopType.id,
                currentStatus: 'AVAILABLE',
            },
        });

        await prisma.equipment.create({
            data: {
                serialNumber: 'LAPTOP-002',
                brand: 'HP',
                model: 'EliteBook 840',
                typeId: laptopType.id,
                currentStatus: 'AVAILABLE',
            },
        });

        console.log('✅ Sample equipment created');
    }

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
