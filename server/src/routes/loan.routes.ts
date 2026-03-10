import { Router, Request, Response } from 'express';
import { Condition } from '@prisma/client';
import prisma from '../lib/prisma';
import { generateValidationCode, formatEquipmentList, formatAccountList, formatDate } from '../utils/helpers';
import { sendCheckoutEmail, sendReturnEmail } from '../services/email.service';

const router = Router();

interface CollaboratorPayload {
    email: string;
    lastName: string;
    firstName: string;
    department?: string | null;
    loanDate?: string | null;
}

interface EquipmentCheckoutItemPayload {
    equipmentId: string;
    conditionOut: Condition;
    notes?: string;
}

interface CheckoutRequestBody {
    collaborator: CollaboratorPayload;
    equipment: EquipmentCheckoutItemPayload[];
    accounts?: string[];
    checkoutNotes?: string;
    itStaffName: string;
}

interface ReturnItemPayload {
    id: string;
    returned: boolean;
    conditionIn?: Condition | null;
    returnNotes?: string | null;
}

interface ReturnAccountPayload {
    id: string;
    returned: boolean;
    returnNotes?: string | null;
}

interface ReturnRequestBody {
    items: ReturnItemPayload[];
    accounts?: ReturnAccountPayload[];
    itStaffName: string;
}

// Create new loan (checkout)
// NOTE: In the current UX, the collaborator validates the loan directly on-site,
// so we immediately mark the loan as validated and put equipment ON_LOAN.
router.post('/checkout', async (req: Request<unknown, unknown, CheckoutRequestBody>, res: Response) => {
    try {
        const { collaborator, equipment, accounts, checkoutNotes, itStaffName } = req.body;

        const validationCode = generateValidationCode();

        const loan = await prisma.$transaction(async (tx) => {
            // Find or create user
            let user = await tx.user.findUnique({
                where: { email: collaborator.email },
            });

            if (!user) {
                user = await tx.user.create({
                    data: {
                        email: collaborator.email,
                        lastName: collaborator.lastName,
                        firstName: collaborator.firstName,
                        department: collaborator.department ?? undefined,
                        hireDate: collaborator.loanDate ? new Date(collaborator.loanDate) : null,
                    },
                });
            }

            const createdLoan = await tx.loan.create({
                data: {
                    userId: user.id,
                    validationCode,
                    checkoutNotes,
                    checkoutITStaff: itStaffName,
                    checkoutValidated: true,
                    items: {
                        create: equipment.map((item) => ({
                            equipmentId: item.equipmentId,
                            conditionOut: item.conditionOut,
                        })),
                    },
                    accounts: accounts && accounts.length > 0 ? {
                        create: accounts.map((accountTypeId) => ({
                            accountTypeId,
                        }))
                    } : undefined,
                },
                include: {
                    items: {
                        include: {
                            equipment: {
                                include: {
                                    type: true,
                                },
                            },
                        },
                    },
                    accounts: {
                        include: {
                            accountType: true,
                        }
                    },
                    user: true,
                },
            });

            // Update equipment status to ON_LOAN
            await Promise.all(
                createdLoan.items.map((item) =>
                    tx.equipment.update({
                        where: { id: item.equipmentId },
                        data: { currentStatus: 'ON_LOAN' },
                    })
                )
            );

            return createdLoan;
        });

        // Send checkout confirmation email (same content as after validation)
        let emailSent = false;
        try {
            const equipmentList = formatEquipmentList(loan.items);
            const accountsList = formatAccountList(loan.accounts || []);
            const collaboratorName = `${loan.user.firstName} ${loan.user.lastName}`;
            const loanDate = formatDate(loan.checkoutDate);

            await sendCheckoutEmail(
                loan.user.email,
                collaboratorName,
                equipmentList,
                accountsList,
                loanDate
            );
            emailSent = true;
        } catch (emailError) {
            console.error('Error sending checkout email:', emailError);
        }

        res.json({
            success: true,
            loanId: loan.id,
            validationCode,
            emailSent,
            message: 'Loan created and validated successfully.',
        });
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({ error: 'Failed to create loan' });
    }
});

// Get pending loan for validation
router.get('/pending/:email/:code', async (req: Request, res: Response) => {
    try {
        const { email, code } = req.params;

        const loan = await prisma.loan.findFirst({
            where: {
                validationCode: code,
                checkoutValidated: false,
                user: {
                    email,
                },
            },
            include: {
                items: {
                    include: {
                        equipment: {
                            include: {
                                type: true,
                            },
                        },
                    },
                },
                accounts: {
                    include: {
                        accountType: true,
                    }
                },
                user: true,
            },
        });

        if (!loan) {
            return res.status(404).json({ error: 'Loan not found or already validated' });
        }

        res.json(loan);
    } catch (error) {
        console.error('Error fetching pending loan:', error);
        res.status(500).json({ error: 'Failed to fetch loan' });
    }
});

// Validate checkout by collaborator
router.post('/validate-checkout/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const loan = await prisma.loan.findFirst({
            where: {
                validationCode: code,
                checkoutValidated: false,
            },
            include: {
                items: {
                    include: {
                        equipment: {
                            include: {
                                type: true,
                            },
                        },
                    },
                },
                accounts: {
                    include: {
                        accountType: true,
                    }
                },
                user: true,
            },
        });

        if (!loan) {
            return res.status(404).json({ error: 'Loan not found or already validated' });
        }

        // Update loan status
        const updatedLoan = await prisma.loan.update({
            where: { id: loan.id },
            data: { checkoutValidated: true },
            include: {
                items: {
                    include: {
                        equipment: {
                            include: {
                                type: true,
                            },
                        },
                    },
                },
                accounts: {
                    include: {
                        accountType: true,
                    }
                },
                user: true,
            },
        });

        // Update equipment status
        await Promise.all(
            loan.items.map((item) =>
                prisma.equipment.update({
                    where: { id: item.equipmentId },
                    data: { currentStatus: 'ON_LOAN' },
                })
            )
        );

        // Send confirmation email
        const equipmentList = formatEquipmentList(updatedLoan.items);
        const accountsList = formatAccountList(updatedLoan.accounts || []);
        const collaboratorName = `${updatedLoan.user.firstName} ${updatedLoan.user.lastName}`;
        const loanDate = formatDate(updatedLoan.checkoutDate);

        await sendCheckoutEmail(
            updatedLoan.user.email,
            collaboratorName,
            equipmentList,
            accountsList,
            loanDate
        );

        res.json({
            success: true,
            message: 'Loan validated successfully',
            loan: updatedLoan,
        });
    } catch (error) {
        console.error('Error validating checkout:', error);
        res.status(500).json({ error: 'Failed to validate loan' });
    }
});

// Search active loans
router.get('/active', async (req: Request, res: Response) => {
    try {
        const { search } = req.query;

        const loans = await prisma.loan.findMany({
            where: {
                status: 'ACTIVE',
                checkoutValidated: true,
                ...(search && {
                    user: {
                        OR: [
                            { email: { contains: search as string } },
                            { firstName: { contains: search as string } },
                            { lastName: { contains: search as string } },
                        ],
                    },
                }),
            },
            include: {
                items: {
                    include: {
                        equipment: {
                            include: {
                                type: true,
                            },
                        },
                    },
                },
                accounts: {
                    include: {
                        accountType: true,
                    }
                },
                user: true,
            },
            orderBy: {
                checkoutDate: 'desc',
            },
        });

        res.json(loans);
    } catch (error) {
        console.error('Error searching loans:', error);
        res.status(500).json({ error: 'Failed to search loans' });
    }
});

// Process return
// In the current UX, the return is confirmed directly by IT; no validation code is needed.
// We immediately mark the loan's return as validated, update equipment status, and
// send a confirmation email to the IT team.
router.post(
    '/return/:loanId',
    async (req: Request<{ loanId: string }, unknown, ReturnRequestBody>, res: Response) => {
        try {
            const { loanId } = req.params;
            const { items, accounts, itStaffName } = req.body;

            const updatedLoan = await prisma.$transaction(async (tx) => {
                // Update loan items with return data
                await Promise.all(
                    items.map((item) =>
                        tx.loanItem.update({
                            where: { id: item.id },
                            data: {
                                returned: item.returned,
                                conditionIn: item.conditionIn ?? null,
                                returnNotes: item.returnNotes ?? null,
                            },
                        })
                    )
                );

                // Update loan accounts with return data
                if (accounts) {
                    await Promise.all(
                        accounts.map((acc) =>
                            tx.loanAccount.update({
                                where: { id: acc.id },
                                data: {
                                    returned: acc.returned,
                                    returnNotes: acc.returnNotes ?? null,
                                },
                            })
                        )
                    );
                }

                // Reload loan with items and user to compute status and send email
                const loan = await tx.loan.findUnique({
                    where: { id: loanId },
                    include: {
                        items: {
                            include: {
                                equipment: {
                                    include: { type: true },
                                },
                            },
                        },
                        accounts: {
                            include: { accountType: true }
                        },
                        user: true,
                    },
                });

                if (!loan) {
                    throw new Error('LOAN_NOT_FOUND');
                }

                const allEquipmentReturned = loan.items.every((item) => item.returned);
                const allAccountsReturned = loan.accounts.every((acc) => acc.returned);
                const allReturned = allEquipmentReturned && allAccountsReturned;

                // Update loan flags and status
                const loanAfterUpdate = await tx.loan.update({
                    where: { id: loan.id },
                    data: {
                        returnITStaff: itStaffName,
                        returnValidated: true,
                        status: allReturned ? 'RETURNED' : 'ACTIVE',
                        returnDate: allReturned ? new Date() : null,
                    },
                    include: {
                        items: {
                            include: {
                                equipment: {
                                    include: { type: true },
                                },
                            },
                        },
                        accounts: {
                            include: { accountType: true }
                        },
                        user: true,
                    },
                });

                // Update equipment status and condition based on condition at return
                await Promise.all(
                    loanAfterUpdate.items
                        .filter((item) => item.returned)
                        .map((item) =>
                            tx.equipment.update({
                                where: { id: item.equipmentId },
                                data: {
                                    currentStatus:
                                        item.conditionIn === Condition.DAMAGED
                                            ? 'MAINTENANCE'
                                            : 'AVAILABLE',
                                    // Persist the new condition as the equipment's baseline condition
                                    condition: item.conditionIn ?? item.equipment.condition,
                                },
                            })
                        )
                );

                return loanAfterUpdate;
            });

            // Send confirmation email only to IT
            let emailSent = false;
            try {
                const returnedItems = updatedLoan.items.filter((item) => item.returned);
                const returnedAccounts = updatedLoan.accounts?.filter((acc) => acc.returned) || [];
                const equipmentList = formatEquipmentList(returnedItems);
                const accountsList = formatAccountList(returnedAccounts);
                const collaboratorName = `${updatedLoan.user.firstName} ${updatedLoan.user.lastName}`;
                const returnDate = formatDate(new Date());

                await sendReturnEmail(
                    'hfannir@geb.fr',
                    collaboratorName,
                    equipmentList,
                    accountsList,
                    returnDate,
                    updatedLoan.returnITStaff || 'N/A'
                );
                emailSent = true;
            } catch (emailError) {
                console.error('Error sending return email:', emailError);
            }

            res.json({
                success: true,
                emailSent,
                message: 'Return processed and email handled for IT.',
                loan: updatedLoan,
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'LOAN_NOT_FOUND') {
                return res.status(404).json({ error: 'Loan not found' });
            }
            console.error('Error processing return:', error);
            return res.status(500).json({ error: 'Failed to process return' });
        }
    }
);

// Update accounts for an active loan
router.put('/:loanId/accounts', async (req: Request, res: Response) => {
    try {
        const { loanId } = req.params;
        const { accounts } = req.body as { accounts: string[] };

        const existingLoan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: { accounts: true }
        });

        if (!existingLoan) return res.status(404).json({ error: 'Loan not found' });

        const existingIds = existingLoan.accounts.map(a => a.accountTypeId);
        const toAdd = accounts.filter(id => !existingIds.includes(id));

        if (toAdd.length > 0) {
            await prisma.loanAccount.createMany({
                data: toAdd.map(accountTypeId => ({
                    loanId,
                    accountTypeId
                }))
            });
        }

        const updatedLoan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: {
                items: { include: { equipment: { include: { type: true } } } },
                accounts: { include: { accountType: true } },
                user: true
            }
        });

        res.json(updatedLoan);
    } catch (error) {
        console.error('Error updating loan accounts:', error);
        res.status(500).json({ error: 'Failed to update loan accounts' });
    }
});

export default router;
