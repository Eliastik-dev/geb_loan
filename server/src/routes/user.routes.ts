import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

function parseUserId(idParam: string): number | null {
    const n = Number.parseInt(idParam, 10);
    return Number.isFinite(n) ? n : null;
}

// GET all users
router.get('/', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET single user
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseUserId(req.params.id);
        if (id === null) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST create user
router.post('/', async (req: Request, res: Response) => {
    try {
        const { email, firstName, lastName, department, hireDate } = req.body;

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
        }

        const user = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                department,
                hireDate: hireDate ? new Date(hireDate) : null,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT update user
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseUserId(req.params.id);
        if (id === null) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const { email, firstName, lastName, department, hireDate } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                email,
                firstName,
                lastName,
                department,
                hireDate: hireDate ? new Date(hireDate) : null,
            },
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE user
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseUserId(req.params.id);
        if (id === null) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        await prisma.user.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
