import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get all equipment types
router.get('/types', async (req: Request, res: Response) => {
    try {
        const types = await prisma.equipmentType.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(types);
    } catch (error) {
        console.error('Error fetching equipment types:', error);
        res.status(500).json({ error: 'Failed to fetch equipment types' });
    }
});

// Create equipment type
router.post('/types', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const type = await prisma.equipmentType.create({
            data: { name, description },
        });
        res.json(type);
    } catch (error) {
        console.error('Error creating equipment type:', error);
        res.status(500).json({ error: 'Failed to create equipment type' });
    }
});

// Get all available equipment
router.get('/available', async (req: Request, res: Response) => {
    try {
        const equipment = await prisma.equipment.findMany({
            where: { currentStatus: 'AVAILABLE' },
            include: { type: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(equipment);
    } catch (error) {
        console.error('Error fetching available equipment:', error);
        res.status(500).json({ error: 'Failed to fetch available equipment' });
    }
});

// Get all equipment
router.get('/', async (req: Request, res: Response) => {
    try {
        const equipment = await prisma.equipment.findMany({
            include: { type: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(equipment);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ error: 'Failed to fetch equipment' });
    }
});

// Create new equipment
router.post('/', async (req: Request, res: Response) => {
    try {
        const { serialNumber, brand, model, typeId, condition } = req.body;

        // Check if serial number already exists
        const existing = await prisma.equipment.findUnique({
            where: { serialNumber },
        });

        if (existing) {
            return res.status(400).json({ error: 'Serial number already exists' });
        }

        const equipment = await prisma.equipment.create({
            data: {
                serialNumber,
                brand,
                model,
                typeId,
                condition: condition || 'GOOD',
            },
            include: { type: true },
        });

        res.json(equipment);
    } catch (error) {
        console.error('Error creating equipment:', error);
        res.status(500).json({ error: 'Failed to create equipment' });
    }
});

// Update equipment
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { serialNumber, brand, model, typeId, currentStatus, condition } = req.body;

        const equipment = await prisma.equipment.update({
            where: { id },
            data: {
                serialNumber,
                brand,
                model,
                typeId,
                currentStatus,
                condition: condition || 'GOOD',
            },
            include: { type: true },
        });

        res.json(equipment);
    } catch (error) {
        console.error('Error updating equipment:', error);
        res.status(500).json({ error: 'Failed to update equipment' });
    }
});

// Delete equipment
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.equipment.delete({ where: { id } });
        res.json({ success: true, message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        res.status(500).json({ error: 'Failed to delete equipment' });
    }
});

// Check serial number availability
router.get('/check-serial/:serialNumber', async (req: Request, res: Response) => {
    try {
        const { serialNumber } = req.params;
        const equipment = await prisma.equipment.findUnique({
            where: { serialNumber },
        });
        res.json({ available: !equipment });
    } catch (error) {
        console.error('Error checking serial number:', error);
        res.status(500).json({ error: 'Failed to check serial number' });
    }
});

export default router;
