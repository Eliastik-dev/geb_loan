import React, { useCallback, useRef, useState } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Divider,
    TextField,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { loanApi } from '../api/client';
import type { Loan, LoanAccount, LoanItem } from '../types';
import { useTableSort } from '../hooks/useTableSort';
import SortableTableHeaderCell from '../components/SortableTableHeaderCell';
import ConditionChip from '../components/ConditionChip';

const ReturnedLoansHistory: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedSearch = useCallback((value: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSearchQuery(value), 300);
    }, []);

    const {
        data: returnedLoans = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['returned-loans', searchQuery],
        queryFn: async () => {
            const response = await loanApi.getReturned(searchQuery || undefined);
            return response.data as Loan[];
        },
        retry: false,
    });

    const getReturnedLoanSortValue = useCallback((loan: Loan, col: string) => {
        switch (col) {
            case 'collab':
                return `${loan.user.firstName} ${loan.user.lastName}`;
            case 'email':
                return loan.user.email;
            case 'dept':
                return loan.user.department ?? '';
            case 'checkout':
                return new Date(loan.checkoutDate).toISOString();
            case 'return':
                return loan.returnDate ? new Date(loan.returnDate).toISOString() : '';
            case 'count':
                return loan.items.length;
            case 'itout':
                return loan.checkoutITStaff;
            case 'itin':
                return loan.returnITStaff ?? '';
            case 'status':
                return loan.status;
            default:
                return '';
        }
    }, []);

    const getModalItemSortValue = useCallback((item: LoanItem, col: string) => {
        switch (col) {
            case 'equip':
                return `${item.equipment.type.name} ${item.equipment.brand} ${item.equipment.model}`;
            case 'serial':
                return item.equipment.serialNumber;
            case 'tag':
                return item.equipment.serviceTag ?? '';
            case 'out':
                return item.conditionOut;
            case 'in':
                return item.conditionIn ?? '';
            case 'notes':
                return item.returnNotes ?? '';
            default:
                return '';
        }
    }, []);

    const getModalAccountSortValue = useCallback((acc: LoanAccount, col: string) => {
        switch (col) {
            case 'type':
                return acc.accountType?.name ?? '';
            case 'status':
                return acc.returned ? 'Désactivé' : 'Actif';
            case 'notes':
                return acc.returnNotes ?? '';
            default:
                return '';
        }
    }, []);

    const {
        sortedRows: sortedReturnedLoans,
        orderBy: loanOrderBy,
        order: loanOrder,
        requestSort: requestLoanSort,
    } = useTableSort(returnedLoans, getReturnedLoanSortValue);

    const modalItems = selectedLoan?.items ?? [];
    const {
        sortedRows: sortedModalItems,
        orderBy: itemOrderBy,
        order: itemOrder,
        requestSort: requestItemSort,
    } = useTableSort(modalItems, getModalItemSortValue);

    const modalAccounts = selectedLoan?.accounts ?? [];
    const {
        sortedRows: sortedModalAccounts,
        orderBy: accOrderBy,
        order: accOrder,
        requestSort: requestAccSort,
    } = useTableSort(modalAccounts, getModalAccountSortValue);

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Historique des prêts rendus
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Recherche
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <TextField
                    fullWidth
                    label="Rechercher par email, nom ou prénom"
                    placeholder="Tapez pour rechercher..."
                    onChange={(e) => debouncedSearch(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                />

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
            </Paper>

            {isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {axios.isAxiosError(error) && error.response?.status === 404
                        ? "L'endpoint d'historique n'est pas disponible sur ce serveur. Déployez/redémarrez l'API backend."
                        : 'Erreur lors du chargement de l’historique. Veuillez réessayer.'}
                </Alert>
            )}

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Prêts rendus ({returnedLoans.length})
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <SortableTableHeaderCell
                                    columnId="collab"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Collaborateur
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="email"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Email
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="dept"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Département
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="checkout"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Date de prêt
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="return"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Date de retour
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="count"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Équipements
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="itout"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    IT prêt
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="itin"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    IT retour
                                </SortableTableHeaderCell>
                                <SortableTableHeaderCell
                                    columnId="status"
                                    orderBy={loanOrderBy}
                                    order={loanOrder}
                                    onRequestSort={requestLoanSort}
                                >
                                    Statut
                                </SortableTableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedReturnedLoans.map((loan) => (
                                <TableRow
                                    key={loan.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedLoan(loan)}
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
                                    <TableCell>
                                        {loan.returnDate
                                            ? new Date(loan.returnDate).toLocaleDateString('fr-FR')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{loan.items.length}</TableCell>
                                    <TableCell>{loan.checkoutITStaff}</TableCell>
                                    <TableCell>{loan.returnITStaff || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={loan.status === 'RETURNED' ? 'Rendu' : loan.status}
                                            color={loan.status === 'RETURNED' ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && returnedLoans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9}>
                                        <Typography variant="body2" color="text.secondary">
                                            Aucun prêt rendu trouvé.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Detail modal */}
            <Dialog
                open={Boolean(selectedLoan)}
                onClose={() => setSelectedLoan(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Détails du prêt rendu</DialogTitle>
                <DialogContent dividers>
                    {selectedLoan && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Collaborateur
                                </Typography>
                                <Typography>
                                    {selectedLoan.user.firstName} {selectedLoan.user.lastName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedLoan.user.email}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedLoan.user.department ||
                                        'Département non spécifié'}
                                </Typography>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Informations de prêt
                                </Typography>
                                <Stack spacing={0.5}>
                                    <Typography variant="body2">
                                        <strong>Date de prêt :</strong>{' '}
                                        {new Date(
                                            selectedLoan.checkoutDate
                                        ).toLocaleDateString('fr-FR')}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Date de retour :</strong>{' '}
                                        {selectedLoan.returnDate
                                            ? new Date(
                                                  selectedLoan.returnDate
                                              ).toLocaleDateString('fr-FR')
                                            : '-'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>IT prêt :</strong>{' '}
                                        {selectedLoan.checkoutITStaff}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>IT retour :</strong>{' '}
                                        {selectedLoan.returnITStaff || '-'}
                                    </Typography>
                                    {selectedLoan.checkoutNotes && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            <strong>Notes de prêt :</strong>{' '}
                                            {selectedLoan.checkoutNotes}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Matériel
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <SortableTableHeaderCell
                                                columnId="equip"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                Équipement
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="serial"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                Numéro d'inventaire
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="tag"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                Service Tag
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="out"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                État au prêt
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="in"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                État au retour
                                            </SortableTableHeaderCell>
                                            <SortableTableHeaderCell
                                                columnId="notes"
                                                orderBy={itemOrderBy}
                                                order={itemOrder}
                                                onRequestSort={requestItemSort}
                                            >
                                                Notes retour
                                            </SortableTableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortedModalItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {item.equipment.type.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {item.equipment.brand}{' '}
                                                        {item.equipment.model}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {item.equipment.serialNumber}
                                                </TableCell>
                                                <TableCell>
                                                    {item.equipment.serviceTag || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <ConditionChip value={item.conditionOut} />
                                                </TableCell>
                                                <TableCell>
                                                    <ConditionChip
                                                        value={item.conditionIn}
                                                        emptyLabel="Non renseigné"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.returnNotes || '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>

                            {selectedLoan.accounts && selectedLoan.accounts.length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Comptes liés
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <SortableTableHeaderCell
                                                        columnId="type"
                                                        orderBy={accOrderBy}
                                                        order={accOrder}
                                                        onRequestSort={requestAccSort}
                                                    >
                                                        Type de compte
                                                    </SortableTableHeaderCell>
                                                    <SortableTableHeaderCell
                                                        columnId="status"
                                                        orderBy={accOrderBy}
                                                        order={accOrder}
                                                        onRequestSort={requestAccSort}
                                                    >
                                                        Statut
                                                    </SortableTableHeaderCell>
                                                    <SortableTableHeaderCell
                                                        columnId="notes"
                                                        orderBy={accOrderBy}
                                                        order={accOrder}
                                                        onRequestSort={requestAccSort}
                                                    >
                                                        Notes de retour
                                                    </SortableTableHeaderCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedModalAccounts.map((acc) => (
                                                    <TableRow key={acc.id}>
                                                        <TableCell>
                                                            {acc.accountType?.name || 'Inconnu'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {acc.returned
                                                                ? 'Désactivé'
                                                                : 'Actif'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {acc.returnNotes || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedLoan(null)}>Fermer</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ReturnedLoansHistory;

