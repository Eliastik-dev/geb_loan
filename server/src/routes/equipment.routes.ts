import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

function normalizeServiceTag(raw: unknown): string | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string') return null;
    const t = raw.trim();
    return t.length > 0 ? t : null;
}

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
        const { serialNumber, brand, model, typeId, condition, comments } = req.body;
        const serviceTag = normalizeServiceTag(req.body.serviceTag);

        if (serviceTag) {
            const tagTaken = await prisma.equipment.findFirst({
                where: { serviceTag },
            });
            if (tagTaken) {
                return res.status(400).json({ error: 'Service Tag already in use' });
            }
        }

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
                serviceTag,
                brand,
                model,
                typeId,
                condition: condition || 'GOOD',
                comments: comments ?? null,
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
        const { serialNumber, brand, model, typeId, currentStatus, condition, comments } = req.body;

        let serviceTag: string | null | undefined = undefined;
        if ('serviceTag' in req.body) {
            serviceTag = normalizeServiceTag(req.body.serviceTag);
        }

        if (serviceTag) {
            const tagTaken = await prisma.equipment.findFirst({
                where: { serviceTag, NOT: { id } },
            });
            if (tagTaken) {
                return res.status(400).json({ error: 'Service Tag already in use' });
            }
        }

        const equipment = await prisma.equipment.update({
            where: { id },
            data: {
                serialNumber,
                brand,
                model,
                typeId,
                currentStatus,
                condition: condition || 'GOOD',
                comments: comments ?? null,
                ...(serviceTag !== undefined ? { serviceTag } : {}),
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
        const eq = await prisma.equipment.findUnique({
            where: { id },
            select: { id: true, currentStatus: true },
        });

        if (!eq) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        if (eq.currentStatus !== 'AVAILABLE') {
            return res.status(400).json({
                error: "Impossible de supprimer : l'équipement n'est pas disponible (en prêt ou indisponible).",
            });
        }

        await prisma.equipment.delete({ where: { id } });
        res.json({ success: true, message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        const code = (error as any)?.code;
        // P2003: Foreign key constraint failed (e.g., equipment referenced by a loan item)
        if (code === 'P2003') {
            return res.status(409).json({
                error: "Suppression impossible : cet équipement est déjà référencé (ex: prêt existant).",
            });
        }
        // P2025: Record not found
        if (code === 'P2025') {
            return res.status(404).json({ error: 'Equipment not found' });
        }
        return res.status(500).json({ error: 'Failed to delete equipment' });
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
