import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const RECENT_ACTIVITY_LIMIT = 10;

const loanActivityInclude = {
    user: {
        select: {
            firstName: true,
            lastName: true,
            department: true,
        },
    },
    items: {
        include: {
            equipment: {
                select: {
                    brand: true,
                    model: true,
                    type: { select: { name: true } },
                },
            },
        },
    },
} as const;

type LoanActivity = {
    id: string;
    checkoutDate: Date;
    returnDate: Date | null;
    checkoutITStaff: string;
    returnITStaff: string | null;
    user: {
        firstName: string;
        lastName: string;
        department: string | null;
    };
    items: Array<{
        equipment: {
            brand: string;
            model: string;
            type: { name: string };
        };
    }>;
};

function formatEquipmentLabel(items: LoanActivity['items']): string {
    if (items.length === 0) return 'Aucun équipement';

    const first = items[0].equipment;
    const label = `${first.type.name} ${first.brand} ${first.model}`.trim();
    if (items.length === 1) return label;
    return `${label} (+${items.length - 1})`;
}

function toActivity(loan: LoanActivity, type: 'CHECKOUT' | 'RETURN') {
    const occurredAt = type === 'CHECKOUT' ? loan.checkoutDate : loan.returnDate;
    if (!occurredAt) return null;

    return {
        id: `${loan.id}-${type.toLowerCase()}`,
        type,
        occurredAt: occurredAt.toISOString(),
        collaboratorName: `${loan.user.firstName} ${loan.user.lastName}`,
        department: loan.user.department,
        itStaff: type === 'CHECKOUT' ? loan.checkoutITStaff : loan.returnITStaff ?? '',
        equipmentLabel: formatEquipmentLabel(loan.items),
        equipmentCount: loan.items.length,
    };
}

// Dashboard statistics
router.get('/overview', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [availableEquipment, activeLoans, returnsThisMonth, pendingValidations, recentCheckouts, recentReturns] =
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
                prisma.loan.findMany({
                    take: RECENT_ACTIVITY_LIMIT,
                    orderBy: { checkoutDate: 'desc' },
                    include: loanActivityInclude,
                }),
                prisma.loan.findMany({
                    where: { returnDate: { not: null } },
                    take: RECENT_ACTIVITY_LIMIT,
                    orderBy: { returnDate: 'desc' },
                    include: loanActivityInclude,
                }),
            ]);

        const recentActivity = [
            ...recentCheckouts.map((loan) => toActivity(loan, 'CHECKOUT')),
            ...recentReturns.map((loan) => toActivity(loan, 'RETURN')),
        ]
            .filter((activity): activity is NonNullable<typeof activity> => activity !== null)
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, RECENT_ACTIVITY_LIMIT);

        res.json({
            availableEquipment,
            activeLoans,
            returnsThisMonth,
            pendingValidations,
            recentActivity,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

export default router;


