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
import type { Loan } from '../types';

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
                                            <TableCell>Équipement</TableCell>
                                            <TableCell>Numéro d'inventaire</TableCell>
                                            <TableCell>Service Tag</TableCell>
                                            <TableCell>État au prêt</TableCell>
                                            <TableCell>État au retour</TableCell>
                                            <TableCell>Notes retour</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedLoan.items.map((item) => (
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
                                                <TableCell>{item.conditionOut}</TableCell>
                                                <TableCell>
                                                    {item.conditionIn || 'Non renseigné'}
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
                                                    <TableCell>Type de compte</TableCell>
                                                    <TableCell>Statut</TableCell>
                                                    <TableCell>Notes de retour</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedLoan.accounts.map((acc) => (
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

