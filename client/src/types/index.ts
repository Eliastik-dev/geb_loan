export interface User {
    id: string;
    email: string;
    lastName: string;
    firstName: string;
    department?: string;
    hireDate?: Date;
}

export interface EquipmentType {
    id: string;
    name: string;
    description?: string;
}

export enum EquipmentStatus {
    AVAILABLE = 'AVAILABLE',
    ON_LOAN = 'ON_LOAN',
    MAINTENANCE = 'MAINTENANCE',
    RETIRED = 'RETIRED',
}

export enum Condition {
    NEW = 'NEW',
    GOOD = 'GOOD',
    SLIGHT_WEAR = 'SLIGHT_WEAR',
    VISIBLE_WEAR = 'VISIBLE_WEAR',
    DAMAGED = 'DAMAGED',
    LOST = 'LOST',
}

export enum LoanStatus {
    ACTIVE = 'ACTIVE',
    RETURNED = 'RETURNED',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
}

export interface Equipment {
    id: string;
    serialNumber: string;
    brand: string;
    model: string;
    typeId: string;
    type: EquipmentType;
    currentStatus: EquipmentStatus;
    condition: Condition;
}

export interface LoanItem {
    id: string;
    loanId: string;
    equipmentId: string;
    equipment: Equipment;
    conditionOut: Condition;
    conditionIn?: Condition;
    returned: boolean;
    returnNotes?: string;
}

export interface AccountType {
    id: string;
    name: string;
    description?: string;
    defaultProvision?: boolean;
}

export interface LoanAccount {
    id: string;
    loanId: string;
    accountTypeId: string;
    accountType?: AccountType;
    provisionedAt: Date;
    deactivatedAt?: Date;
    returned: boolean;
    returnNotes?: string;
}

// Loan interface for equipment loans
export interface Loan {
    id: string;
    userId: string;
    user: User;
    validationCode: string;
    checkoutDate: Date;
    returnDate?: Date;
    status: LoanStatus;
    checkoutNotes?: string;
    checkoutITStaff: string;
    returnITStaff?: string;
    items: LoanItem[];
    accounts?: LoanAccount[];
    checkoutValidated: boolean;
    returnValidated: boolean;
}

export interface CollaboratorFormData {
    email: string;
    lastName: string;
    firstName: string;
    department?: string;
    loanDate?: Date;
}

export interface EquipmentFormData {
    equipmentId: string;
    conditionOut: Condition;
}

export interface CheckoutFormData {
    collaborator: CollaboratorFormData;
    equipment: EquipmentFormData[];
    checkoutNotes?: string;
    itStaffName: string;
}
