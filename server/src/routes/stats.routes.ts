import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Dashboard statistics
router.get('/overview', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [availableEquipment, activeLoans, returnsThisMonth, pendingValidations] =
            await Promise.all([
                prisma.equipment.count({
                    where: { currentStatus: 'AVAILABLE' },
                }),
                prisma.loan.count({
                    where: {
                        status: 'ACTIVE',
                        checkoutValidated: true,
                    },
                }),
                prisma.loan.count({
                    where: {
                        status: 'RETURNED',
                        returnDate: {
                            gte: startOfMonth,
                        },
                    },
                }),
                prisma.loan.count({
                    where: {
                        OR: [
                            { checkoutValidated: false },
                            {
                                returnDate: { not: null },
                                returnValidated: false,
                            },
                        ],
                    },
                }),
            ]);

        res.json({
            availableEquipment,
            activeLoans,
            returnsThisMonth,
            pendingValidations,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

export default router;


