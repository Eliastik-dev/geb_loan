import { Condition } from '@prisma/client';

export const generateValidationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

type EquipmentWithType = {
    type: {
        name: string;
    };
    brand: string;
    model: string;
    serialNumber: string;
};

type LoanItemForEmail = {
    equipment: EquipmentWithType;
    conditionOut: Condition;
};

export const formatEquipmentList = (items: LoanItemForEmail[]): string => {
    if (!items || items.length === 0) return 'Aucun équipement.';
    return items
        .map(
            (item, index) =>
                `${index + 1}. ${item.equipment.type.name} - ${item.equipment.brand} ${item.equipment.model}
   Numéro de série: ${item.equipment.serialNumber}
   État: ${getConditionLabel(item.conditionOut)}`
        )
        .join('\n\n');
};

type AccountForEmail = {
    accountType: {
        name: string;
    };
    returned?: boolean;
};

export const formatAccountList = (accounts: AccountForEmail[]): string => {
    if (!accounts || accounts.length === 0) return 'Aucun compte.';
    return accounts.map((acc, index) => `${index + 1}. Compte ${acc.accountType.name}`).join('\n');
};

export const getConditionLabel = (condition: Condition): string => {
    const labels: Record<Condition, string> = {
        [Condition.NEW]: 'Neuf',
        [Condition.GOOD]: 'Bon état',
        [Condition.SLIGHT_WEAR]: 'Légère usure',
        [Condition.VISIBLE_WEAR]: 'Usure visible',
        [Condition.DAMAGED]: 'Endommagé',
        [Condition.LOST]: 'Perdu',
    };
    return labels[condition] ?? condition;
};
