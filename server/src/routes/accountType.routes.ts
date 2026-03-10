import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET all account types
router.get('/', async (req: Request, res: Response) => {
    try {
        const accountTypes = await prisma.accountType.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(accountTypes);
    } catch (error) {
        console.error('Error fetching account types:', error);
        res.status(500).json({ error: 'Failed to fetch account types' });
    }
});

// POST create account type
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        const existing = await prisma.accountType.findUnique({
            where: { name },
        });

        if (existing) {
            return res.status(400).json({ error: 'Ce type de compte existe déjà' });
        }

        const accountType = await prisma.accountType.create({
            data: { name, description },
        });

        res.status(201).json(accountType);
    } catch (error) {
        console.error('Error creating account type:', error);
        res.status(500).json({ error: 'Failed to create account type' });
    }
});

// PUT update account type
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const accountType = await prisma.accountType.update({
            where: { id },
            data: { name, description },
        });

        res.json(accountType);
    } catch (error) {
        console.error('Error updating account type:', error);
        res.status(500).json({ error: 'Failed to update account type' });
    }
});

// DELETE account type
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.accountType.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting account type:', error);
        res.status(500).json({ error: 'Failed to delete account type' });
    }
});

export default router;
