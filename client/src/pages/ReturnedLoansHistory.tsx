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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { loanApi } from '../api/client';
import type { Loan } from '../types';

const ReturnedLoansHistory: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedSearch = useCallback((value: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSearchQuery(value), 300);
    }, []);

    const {
        data: returnedLoans = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['returned-loans', searchQuery],
        queryFn: async () => {
            const response = await loanApi.getReturned(searchQuery || undefined);
            return response.data as Loan[];
        },
    });

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
                    Erreur lors du chargement de l’historique. Veuillez réessayer.
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
                                <TableCell>Collaborateur</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Département</TableCell>
                                <TableCell>Date de prêt</TableCell>
                                <TableCell>Date de retour</TableCell>
                                <TableCell>Équipements</TableCell>
                                <TableCell>IT prêt</TableCell>
                                <TableCell>IT retour</TableCell>
                                <TableCell>Statut</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {returnedLoans.map((loan) => (
                                <TableRow key={loan.id} hover>
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
        </Container>
    );
};

export default ReturnedLoansHistory;

