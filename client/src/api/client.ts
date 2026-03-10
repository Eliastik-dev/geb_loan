import axios from 'axios';
import type { Condition } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Equipment API
export interface CreateEquipmentPayload {
    serialNumber: string;
    brand: string;
    model: string;
    typeId: string;
    condition?: Condition;
}

export interface UpdateEquipmentPayload extends CreateEquipmentPayload {
    currentStatus?: string;
}

// Users API
export interface UserPayload {
    email: string;
    lastName: string;
    firstName: string;
    department?: string;
    hireDate?: string | null;
}

export const usersApi = {
    getAll: () => api.get('/users'),
    create: (data: UserPayload) => api.post('/users', data),
    update: (id: string, data: UserPayload) => api.put(`/users/${id}`, data),
    delete: (id: string) => api.delete(`/users/${id}`),
};

// Account Types API
export interface AccountTypePayload {
    name: string;
    description?: string;
}

export const accountTypesApi = {
    getAll: () => api.get('/account-types'),
    create: (data: AccountTypePayload) => api.post('/account-types', data),
    update: (id: string, data: AccountTypePayload) => api.put(`/account-types/${id}`, data),
    delete: (id: string) => api.delete(`/account-types/${id}`),
};

export const equipmentApi = {
    getAll: () => api.get('/equipment'),
    getAvailable: () => api.get('/equipment/available'),
    getTypes: () => api.get('/equipment/types'),
    createType: (data: { name: string; description?: string }) =>
        api.post('/equipment/types', data),
    create: (data: CreateEquipmentPayload) => api.post('/equipment', data),
    update: (id: string, data: UpdateEquipmentPayload) => api.put(`/equipment/${id}`, data),
    delete: (id: string) => api.delete(`/equipment/${id}`),
    checkSerial: (serialNumber: string) =>
        api.get(`/equipment/check-serial/${serialNumber}`),
};

// Loan API
export interface CheckoutEquipmentItemPayload {
    equipmentId: string;
    conditionOut: Condition;
    notes?: string;
}

export interface CheckoutPayload {
    collaborator: {
        email: string;
        lastName: string;
        firstName: string;
        department?: string;
        loanDate?: string | null;
    };
    equipment: CheckoutEquipmentItemPayload[];
    accounts?: string[];
    checkoutNotes?: string;
    itStaffName: string;
}

export interface ReturnItemPayload {
    id: string;
    returned: boolean;
    conditionIn?: Condition;
    returnNotes?: string;
}

export interface ReturnAccountPayload {
    id: string;
    returned: boolean;
    returnNotes?: string | null;
}

export interface ProcessReturnPayload {
    items: ReturnItemPayload[];
    accounts?: ReturnAccountPayload[];
    itStaffName: string;
}

export const loanApi = {
    checkout: (data: CheckoutPayload) => api.post('/loans/checkout', data),
    getPending: (email: string, code: string) =>
        api.get(`/loans/pending/${email}/${code}`),
    validateCheckout: (code: string) =>
        api.post(`/loans/validate-checkout/${code}`),
    getActive: (search?: string) =>
        api.get('/loans/active', { params: { search } }),
    processReturn: (loanId: string, data: ProcessReturnPayload) =>
        api.post(`/loans/return/${loanId}`, data),
    updateAccounts: (loanId: string, accounts: string[]) =>
        api.put(`/loans/${loanId}/accounts`, { accounts }),
};

// Stats API
export const statsApi = {
    getOverview: () => api.get('/stats/overview'),
};
