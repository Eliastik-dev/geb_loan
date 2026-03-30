import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Container,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    FormControlLabel,
    Divider,
    Alert,
    CircularProgress,
    Autocomplete,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loanApi, accountTypesApi } from '../api/client';
import type { Loan, LoanAccount, LoanItem } from '../types';
import { Condition } from '../types';
import ConditionSelector, { conditionLabels, conditionColors } from '../components/ConditionSelector';
import { useTableSort } from '../hooks/useTableSort';
import SortableTableHeaderCell from '../components/SortableTableHeaderCell';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface ReturnItemFormData {
    id: string;
    returned: boolean;
    conditionIn?: Condition;
    returnNotes?: string;
}

interface ReturnAccountFormData {
    id: string; // LoanAccount ID
    returned: boolean; // Deactivated
    returnNotes?: string;
}

interface ReturnFormValues {
    items: ReturnItemFormData[];
    accounts: ReturnAccountFormData[];
    itStaffName: string;
}

const ReturnPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [showAccountsDialog, setShowAccountsDialog] = useState(false);
    const [editAccountsSelection, setEditAccountsSelection] = useState<string[]>([]);

    const queryClient = useQueryClient();

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedSearch = useCallback((value: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSearchQuery(value), 300);
    }, []);

    const { data: activeLoans = [], isLoading: isLoadingLoans } = useQuery({
        queryKey: ['active-loans', searchQuery],
        queryFn: async () => {
            const response = await loanApi.getActive(searchQuery || undefined);
            return response.data;
        },
    });

    const { data: accountTypesData = [] } = useQuery({
        queryKey: ['accountTypes'],
        queryFn: async () => {
            const response = await accountTypesApi.getAll();
            return response.data;
        },
    });

    const getActiveLoanSortValue = useCallback((loan: Loan, col: string) => {
        switch (col) {
            case 'name':
                return `${loan.user.firstName} ${loan.user.lastName}`;
            case 'email':
                return loan.user.email;
            case 'dept':
                return loan.user.department ?? '';
            case 'date':
                return new Date(loan.checkoutDate).toISOString();
            case 'count':
                return loan.items.length;
            case 'it':
                return loan.checkoutITStaff;
            default:
                return '';
        }
    }, []);

    const {
        sortedRows: sortedActiveLoans,
        orderBy: activeOrderBy,
        order: activeOrder,
        requestSort: requestActiveSort,
    } = useTableSort(activeLoans, getActiveLoanSortValue);

    const returnItemRows = selectedLoan?.items ?? [];
    const getReturnItemSortValue = useCallback((item: LoanItem, col: string) => {
        switch (col) {
            case 'equip':
                return `${item.equipment.type.name} ${item.equipment.brand} ${item.equipment.model}`;
            case 'cout':
                return item.conditionOut;
            case 'cin':
                return item.conditionIn ?? '';
            case 'notes':
                return item.returnNotes ?? '';
            default:
                return '';
        }
    }, []);

    const {
        sortedRows: sortedReturnItems,
        orderBy: retItemOrderBy,
        order: retItemOrder,
        requestSort: requestRetItemSort,
    } = useTableSort(returnItemRows, getReturnItemSortValue);

    const openAccountRows = useMemo(
        () => (selectedLoan?.accounts ?? []).filter((a) => !a.returned),
        [selectedLoan?.accounts]
    );

    const getOpenAccountSortValue = useCallback((acc: LoanAccount, col: string) => {
        switch (col) {
            case 'type':
                return acc.accountType?.name ?? '';
            case 'notes':
                return acc.returnNotes ?? '';
            default:
                return '';
        }
    }, []);

    const {
        sortedRows: sortedOpenAccounts,
        orderBy: accOrderBy,
        order: accOrder,
        requestSort: requestAccSort,
    } = useTableSort(openAccountRows, getOpenAccountSortValue);

    const updateAccountsMutation = useMutation({
        mutationFn: ({ loanId, accounts }: { loanId: string; accounts: string[] }) =>
            loanApi.updateAccounts(loanId, accounts),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-loans'] });
            setShowAccountsDialog(false);
            setEditAccountsSelection([]);
            setSelectedLoan(null);
            setShowSuccessToast(true);
        },
    });

    const processReturnMutation = useMutation({
        mutationFn: ({ loanId, data }: { loanId: string; data: any }) =>
            loanApi.processReturn(loanId, data),
        onSuccess: () => {
            formik.setSubmitting(false);
            setShowSuccessToast(true);
            setSelectedLoan(null);
            formik.resetForm();
            // Refresh active loans, inventory, and available equipment lists
            queryClient.invalidateQueries({ queryKey: ['active-loans'] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            queryClient.invalidateQueries({ queryKey: ['available-equipment'] });
        },
        onError: () => {
            formik.setSubmitting(false);
        },
    });

    const formik = useFormik<ReturnFormValues>({
        initialValues: {
            items: [],
            accounts: [],
            itStaffName: '',
        },
        validationSchema: Yup.object({
            items: Yup.array().of(
                Yup.object({
                    id: Yup.string().required(),
                    returned: Yup.boolean(),
                    conditionIn: Yup.string().when('returned', {
                        is: true,
                        then: (schema) =>
                            schema.oneOf(Object.values(Condition)).required('État requis'),
                    }),
                    returnNotes: Yup.string().when(['returned', 'conditionIn'], {
                        is: (returned: boolean, conditionIn: Condition) =>
                            returned && conditionIn === Condition.DAMAGED,
                        then: (schema) => schema.required('Notes requises pour équipement endommagé'),
                    }),
                })
            ),
            itStaffName: Yup.string().required('Nom du personnel informatique requis'),
        }),
        onSubmit: async (values) => {
            if (!selectedLoan) return;

            const returnData = {
                items: values.items.filter((item) => item.returned),
                accounts: values.accounts.filter((acc) => acc.returned),
                itStaffName: values.itStaffName,
            };

            processReturnMutation.mutate({
                loanId: selectedLoan.id,
                data: returnData,
            });
        },
    });

    const handleSelectLoan = (loan: any) => {
        setSelectedLoan(loan);
        formik.setValues({
            itStaffName: '',
            items: loan.items.map((item: any) => ({
                id: item.id,
                returned: false,
                conditionIn: undefined,
                returnNotes: '',
            })),
            accounts: (loan.accounts || []).map((acc: any) => ({
                id: acc.id,
                returned: false,
                returnNotes: '',
            }))
        });
    };

    const handleMarkAllReturned = () => {
        formik.setValues({
            ...formik.values,
            items: formik.values.items.map((item) => ({
                ...item,
                returned: true,
                conditionIn: item.conditionIn || Condition.GOOD,
            })),
            accounts: formik.values.accounts.map((acc) => ({
                ...acc,
                returned: true,
            }))
        });
    };

    const handleSetAllCondition = (condition: Condition) => {
        formik.setFieldValue(
            'items',
            formik.values.items.map((item) => ({
                ...item,
                conditionIn: condition,
            }))
        );
    };

    const returnedItemsCount = formik.values.items.filter((item) => item.returned).length;
    const returnedAccountsCount = formik.values.accounts.filter((acc) => acc.returned).length;
    const hasSomethingToProcess = returnedItemsCount > 0 || returnedAccountsCount > 0;

    const summaryReturnedItems = useMemo(
        () => formik.values.items.filter((item) => item.returned),
        [formik.values.items]
    );

    const getSummarySortValue = useCallback(
        (row: ReturnItemFormData, col: string) => {
            const li = selectedLoan?.items.find((i) => i.id === row.id);
            switch (col) {
                case 'equip':
                    return li
                        ? `${li.equipment.type.name} ${li.equipment.brand} ${li.equipment.model}`
                        : '';
                case 'cond':
                    return row.conditionIn ?? '';
                case 'notes':
                    return row.returnNotes ?? '';
                default:
                    return '';
            }
        },
        [selectedLoan?.items]
    );

    const {
        sortedRows: sortedSummaryItems,
        orderBy: sumOrderBy,
        order: sumOrder,
        requestSort: requestSumSort,
    } = useTableSort(summaryReturnedItems, getSummarySortValue);

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Retour de matériel
            </Typography>

            {/* Search Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Recherche de collaborateur
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Autocomplete<{ id: string; label: string; loan: Loan }, false, true, true>
                    freeSolo
                    options={activeLoans.map((loan: Loan) => ({
                        id: loan.id,
                        label: `${loan.user.firstName} ${loan.user.lastName} (${loan.user.email})`,
                        loan,
                    }))}
                    onInputChange={(_, value) => debouncedSearch(value)}
                    onChange={(_, option) => {
                        if (option && typeof option === 'object' && 'loan' in option) {
                            handleSelectLoan((option as { id: string; label: string; loan: Loan }).loan);
                        }
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Rechercher par email, nom ou prénom"
                            placeholder="Tapez pour rechercher..."
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                        />
                    )}
                    renderOption={(props, option) => (
                        <Box component="li" {...props}>
                            <Box>
                                <Typography variant="body1">
                                    {option.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {option.loan.user.department || 'Département non spécifié'} •{' '}
                                    {option.loan.items.length} équipement(s)
                                </Typography>
                            </Box>
                        </Box>
                    )}
                />

                {isLoadingLoans && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
            </Paper>

            {/* Active Loans Display */}
            {!selectedLoan && activeLoans.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Prêts actifs trouvés ({sortedActiveLoans.length})
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <SortableTableHeaderCell
                                        columnId="name"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Nom
                                    </SortableTableHeaderCell>
                                    <SortableTableHeaderCell
                                        columnId="email"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Email
                                    </SortableTableHeaderCell>
                                    <SortableTableHeaderCell
                                        columnId="dept"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Département
                                    </SortableTableHeaderCell>
                                    <SortableTableHeaderCell
                                        columnId="date"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Date de prêt
                                    </SortableTableHeaderCell>
                                    <SortableTableHeaderCell
                                        columnId="count"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Équipements
                                    </SortableTableHeaderCell>
                                    <SortableTableHeaderCell
                                        columnId="it"
                                        orderBy={activeOrderBy}
                                        order={activeOrder}
                                        onRequestSort={requestActiveSort}
                                    >
                                        Personnel informatique
                                    </SortableTableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedActiveLoans.map((loan: Loan) => (
                                    <TableRow
                                        key={loan.id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSelectLoan(loan)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {loan.user.firstName} {loan.user.lastName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{loan.user.email}</TableCell>
                                        <TableCell>
                                            {loan.user.department || 'Département non spécifié'}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(loan.checkoutDate).toLocaleDateString('fr-FR')}
                                        </TableCell>
                                        <TableCell>{loan.items.length}</TableCell>
                                        <TableCell>{loan.checkoutITStaff}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Return Processing Form */}
            {selectedLoan && (
                <>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">
                                Traitement du retour - {selectedLoan.user.firstName}{' '}
                                {selectedLoan.user.lastName}
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setSelectedLoan(null);
                                    formik.resetForm();
                                }}
                            >
                                Changer de collaborateur
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleMarkAllReturned}
                            >
                                Tout marquer comme retourné
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleSetAllCondition(Condition.GOOD)}
                            >
                                Tout définir comme "Bon"
                            </Button>
                        </Box>

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Retourné</TableCell>
                                        <SortableTableHeaderCell
                                            columnId="equip"
                                            orderBy={retItemOrderBy}
                                            order={retItemOrder}
                                            onRequestSort={requestRetItemSort}
                                        >
                                            Équipement
                                        </SortableTableHeaderCell>
                                        <SortableTableHeaderCell
                                            columnId="cout"
                                            orderBy={retItemOrderBy}
                                            order={retItemOrder}
                                            onRequestSort={requestRetItemSort}
                                        >
                                            État au prêt
                                        </SortableTableHeaderCell>
                                        <SortableTableHeaderCell
                                            columnId="cin"
                                            orderBy={retItemOrderBy}
                                            order={retItemOrder}
                                            onRequestSort={requestRetItemSort}
                                        >
                                            État au retour
                                        </SortableTableHeaderCell>
                                        <SortableTableHeaderCell
                                            columnId="notes"
                                            orderBy={retItemOrderBy}
                                            order={retItemOrder}
                                            onRequestSort={requestRetItemSort}
                                        >
                                            Notes
                                        </SortableTableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedReturnItems.map((item, index) => {
                                        const formItem = formik.values.items.find(
                                            (fi) => fi.id === item.id
                                        );
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={formItem?.returned || false}
                                                        onChange={(e) => {
                                                            const items = [...formik.values.items];
                                                            const itemIndex = items.findIndex(
                                                                (fi) => fi.id === item.id
                                                            );
                                                            if (itemIndex >= 0) {
                                                                items[itemIndex] = {
                                                                    ...items[itemIndex],
                                                                    returned: e.target.checked,
                                                                    conditionIn:
                                                                        e.target.checked
                                                                            ? items[itemIndex]
                                                                                .conditionIn ||
                                                                            Condition.GOOD
                                                                            : undefined,
                                                                };
                                                            }
                                                            formik.setFieldValue('items', items);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {item.equipment.type.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.equipment.brand} {item.equipment.model}
                                                        </Typography>
                                                        <br />
                                                        <Typography variant="caption" color="text.secondary">
                                                            N° inventaire: {item.equipment.serialNumber}
                                                            {item.equipment.serviceTag
                                                                ? ` · Service Tag: ${item.equipment.serviceTag}`
                                                                : ''}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={conditionLabels[item.conditionOut]}
                                                        size="small"
                                                        color={conditionColors[item.conditionOut]}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {formItem?.returned ? (
                                                        <ConditionSelector
                                                            value={formItem.conditionIn || Condition.GOOD}
                                                            onChange={(value) => {
                                                                const items = [...formik.values.items];
                                                                const itemIndex = items.findIndex(
                                                                    (fi) => fi.id === item.id
                                                                );
                                                                if (itemIndex >= 0) {
                                                                    items[itemIndex] = {
                                                                        ...items[itemIndex],
                                                                        conditionIn: value,
                                                                    };
                                                                }
                                                                formik.setFieldValue('items', items);
                                                            }}
                                                            required
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            -
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formItem?.returned &&
                                                        formItem.conditionIn === Condition.DAMAGED ? (
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            multiline
                                                            rows={2}
                                                            placeholder="Décrire les dommages..."
                                                            value={formItem.returnNotes || ''}
                                                            onChange={(e) => {
                                                                const items = [...formik.values.items];
                                                                const itemIndex = items.findIndex(
                                                                    (fi) => fi.id === item.id
                                                                );
                                                                if (itemIndex >= 0) {
                                                                    items[itemIndex] = {
                                                                        ...items[itemIndex],
                                                                        returnNotes: e.target.value,
                                                                    };
                                                                }
                                                                formik.setFieldValue('items', items);
                                                            }}
                                                            required
                                                            error={
                                                                formik.touched.items?.[index]?.returnNotes &&
                                                                Boolean(
                                                                    formik.errors.items?.[index] &&
                                                                    typeof formik.errors.items[index] === 'object' &&
                                                                    'returnNotes' in formik.errors.items[index] &&
                                                                    formik.errors.items[index].returnNotes
                                                                )
                                                            }
                                                            helperText={
                                                                formik.touched.items?.[index]?.returnNotes &&
                                                                (formik.errors.items?.[index] &&
                                                                    typeof formik.errors.items[index] === 'object' &&
                                                                    'returnNotes' in formik.errors.items[index]
                                                                    ? (formik.errors.items[index] as { returnNotes?: string }).returnNotes
                                                                    : undefined)
                                                            }
                                                        />
                                                    ) : (
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            multiline
                                                            rows={2}
                                                            placeholder="Notes optionnelles..."
                                                            value={formItem?.returnNotes || ''}
                                                            onChange={(e) => {
                                                                const items = [...formik.values.items];
                                                                const itemIndex = items.findIndex(
                                                                    (fi) => fi.id === item.id
                                                                );
                                                                if (itemIndex >= 0) {
                                                                    items[itemIndex] = {
                                                                        ...items[itemIndex],
                                                                        returnNotes: e.target.value,
                                                                    };
                                                                }
                                                                formik.setFieldValue('items', items);
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Accounts Listing */}
                        {selectedLoan.accounts && (
                            <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 2 }}>
                                    <Typography variant="h6">
                                        Comptes provisionnés
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                            setEditAccountsSelection((selectedLoan.accounts || []).filter((a: any) => !a.returned).map((a: any) => a.accountTypeId));
                                            setShowAccountsDialog(true);
                                        }}
                                    >
                                        Modifier les comptes
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />

                                {sortedOpenAccounts.length > 0 && (
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Désactiver</TableCell>
                                                    <SortableTableHeaderCell
                                                        columnId="type"
                                                        orderBy={accOrderBy}
                                                        order={accOrder}
                                                        onRequestSort={requestAccSort}
                                                    >
                                                        Type de compte
                                                    </SortableTableHeaderCell>
                                                    <SortableTableHeaderCell
                                                        columnId="notes"
                                                        orderBy={accOrderBy}
                                                        order={accOrder}
                                                        onRequestSort={requestAccSort}
                                                    >
                                                        Notes
                                                    </SortableTableHeaderCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedOpenAccounts.map((acc: any) => {
                                                    const formAcc = formik.values.accounts.find(
                                                        (fa) => fa.id === acc.id
                                                    );
                                                    return (
                                                        <TableRow key={acc.id}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={formAcc?.returned || false}
                                                                    onChange={(e) => {
                                                                        const accounts = [...formik.values.accounts];
                                                                        const accIndex = accounts.findIndex(
                                                                            (fa) => fa.id === acc.id
                                                                        );
                                                                        if (accIndex >= 0) {
                                                                            accounts[accIndex] = {
                                                                                ...accounts[accIndex],
                                                                                returned: e.target.checked,
                                                                            };
                                                                        }
                                                                        formik.setFieldValue('accounts', accounts);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="bold">
                                                                    {acc.accountType?.name || 'Inconnu'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                {formAcc?.returned ? (
                                                                    <TextField
                                                                        size="small"
                                                                        fullWidth
                                                                        placeholder="Notes optionnelles..."
                                                                        value={formAcc.returnNotes || ''}
                                                                        onChange={(e) => {
                                                                            const accounts = [...formik.values.accounts];
                                                                            const accIndex = accounts.findIndex(
                                                                                (fa) => fa.id === acc.id
                                                                            );
                                                                            if (accIndex >= 0) {
                                                                                accounts[accIndex].returnNotes = e.target.value;
                                                                            }
                                                                            formik.setFieldValue('accounts', accounts);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        -
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </>
                        )}

                        <Box sx={{ mt: 3 }}>
                            <TextField
                                fullWidth
                                label="Nom du personnel informatique *"
                                name="itStaffName"
                                value={formik.values.itStaffName}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={
                                    formik.touched.itStaffName && Boolean(formik.errors.itStaffName)
                                }
                                helperText={formik.touched.itStaffName && formik.errors.itStaffName}
                            />
                        </Box>
                    </Paper>

                    {/* Return Summary */}
                    {returnedItemsCount > 0 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Résumé du retour
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <SortableTableHeaderCell
                                                columnId="equip"
                                                orderBy={sumOrderBy}
                                                order={sumOrder}
                                                onRequestSort={requestSumSort}
                                            >
                                                Équipement
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="cond"
                                                orderBy={sumOrderBy}
                                                order={sumOrder}
                                                onRequestSort={requestSumSort}
                                            >
                                                État au retour
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="notes"
                                                orderBy={sumOrderBy}
                                                order={sumOrder}
                                                onRequestSort={requestSumSort}
                                            >
                                                Notes
                                            </SortableTableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortedSummaryItems.map((item) => {
                                                const loanItem = selectedLoan.items.find(
                                                    (li) => li.id === item.id
                                                );
                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            {loanItem?.equipment.type.name} -{' '}
                                                            {loanItem?.equipment.brand}{' '}
                                                            {loanItem?.equipment.model}
                                                            <Typography
                                                                component="span"
                                                                variant="caption"
                                                                color="text.secondary"
                                                                display="block"
                                                            >
                                                                N° inventaire:{' '}
                                                                {loanItem?.equipment.serialNumber}
                                                                {loanItem?.equipment.serviceTag
                                                                    ? ` · Service Tag: ${loanItem.equipment.serviceTag}`
                                                                    : ''}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.conditionIn ? (
                                                                <Chip
                                                                    label={conditionLabels[item.conditionIn]}
                                                                    size="small"
                                                                    color={conditionColors[item.conditionIn]}
                                                                />
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{item.returnNotes || '-'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setSelectedLoan(null);
                                formik.resetForm();
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                if (!hasSomethingToProcess) {
                                    alert(
                                        'Veuillez marquer au moins un équipement retourné ou au moins un compte à désactiver'
                                    );
                                    return;
                                }
                                formik.handleSubmit();
                            }}
                            disabled={
                                formik.isSubmitting ||
                                processReturnMutation.isPending ||
                                !hasSomethingToProcess
                            }
                            startIcon={
                                formik.isSubmitting || processReturnMutation.isPending ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <CheckCircleIcon />
                                )
                            }
                        >
                            Traiter le retour
                        </Button>
                    </Box>
                </>
            )}

            {/* Error Display */}
            {processReturnMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Erreur lors du traitement du retour. Veuillez réessayer.
                </Alert>
            )}

            {/* Success toast */}
            <Snackbar
                open={showSuccessToast}
                autoHideDuration={4000}
                onClose={() => setShowSuccessToast(false)}
                message="Opération réussie."
            />

            {/* Edit Accounts Dialog */}
            <Dialog open={showAccountsDialog} onClose={() => setShowAccountsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Modifier les comptes provisionnés</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                        {accountTypesData.map((type: any) => (
                            <FormControlLabel
                                key={type.id}
                                control={
                                    <Checkbox
                                        checked={editAccountsSelection.includes(type.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setEditAccountsSelection([...editAccountsSelection, type.id]);
                                            } else {
                                                setEditAccountsSelection(editAccountsSelection.filter(id => id !== type.id));
                                            }
                                        }}
                                    />
                                }
                                label={type.name}
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setShowAccountsDialog(false)}>Annuler</Button>
                    <Button
                        variant="contained"
                        disabled={updateAccountsMutation.isPending}
                        onClick={() => {
                            if (selectedLoan) {
                                updateAccountsMutation.mutate({
                                    loanId: selectedLoan.id,
                                    accounts: editAccountsSelection
                                });
                            }
                        }}
                    >
                        {updateAccountsMutation.isPending ? <CircularProgress size={20} /> : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ReturnPage;
