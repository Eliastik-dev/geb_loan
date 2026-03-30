import React, { useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTableSort } from '../hooks/useTableSort';
import SortableTableHeaderCell from '../components/SortableTableHeaderCell';

const Users: React.FC = () => {
    const [openDialog, setOpenDialog] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState<any>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await usersApi.getAll();
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseDialog();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseDialog();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: usersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const formik = useFormik({
        initialValues: {
            email: '',
            firstName: '',
            lastName: '',
            department: '',
            hireDate: '',
        },
        validationSchema: Yup.object({
            email: Yup.string().email('Email invalide').required('Email requis'),
            firstName: Yup.string().required('Prénom requis'),
            lastName: Yup.string().required('Nom requis'),
        }),
        onSubmit: (values) => {
            const payload = {
                ...values,
                hireDate: values.hireDate ? new Date(values.hireDate).toISOString() : null
            };
            if (editingUser) {
                updateMutation.mutate({ id: editingUser.id, data: payload });
            } else {
                createMutation.mutate(payload);
            }
        },
    });

    const handleEdit = (user: any) => {
        setEditingUser(user);
        formik.setValues({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            department: user.department || '',
            hireDate: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : '',
        });
        setOpenDialog(true);
    };

    const handleDelete = (id: string, email: string) => {
        if (window.confirm(`Voulez-vous vraiment supprimer l'utilisateur ${email} ?`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingUser(null);
        formik.resetForm();
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredUsers = React.useMemo(() => {
        if (!normalizedSearch) return users;

        return users.filter((user: any) => {
            const searchableValues = [
                user.firstName ?? '',
                user.lastName ?? '',
                user.email ?? '',
                user.department ?? '',
            ];

            return searchableValues
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch);
        });
    }, [users, normalizedSearch]);

    const departmentOptions = React.useMemo(() => {
        const set = new Set<string>();
        for (const u of users as { department?: string }[]) {
            const d = u.department?.trim();
            if (d) set.add(d);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    }, [users]);

    const getUserSortValue = useCallback((user: any, col: string) => {
        switch (col) {
            case 'name':
                return `${user.firstName} ${user.lastName}`;
            case 'email':
                return user.email ?? '';
            case 'department':
                return user.department ?? '';
            default:
                return '';
        }
    }, []);

    const { sortedRows: sortedUsers, orderBy: userOrderBy, order: userOrder, requestSort: requestUserSort } =
        useTableSort(filteredUsers, getUserSortValue);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Utilisateurs</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                    Ajouter un utilisateur
                </Button>
            </Box>

            <TextField
                fullWidth
                label="Rechercher un utilisateur"
                placeholder="Nom, prénom, email ou département"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
            />

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <SortableTableHeaderCell
                                columnId="name"
                                orderBy={userOrderBy}
                                order={userOrder}
                                onRequestSort={requestUserSort}
                            >
                                Nom complet
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="email"
                                orderBy={userOrderBy}
                                order={userOrder}
                                onRequestSort={requestUserSort}
                            >
                                Email
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="department"
                                orderBy={userOrderBy}
                                order={userOrder}
                                onRequestSort={requestUserSort}
                            >
                                Département
                            </SortableTableHeaderCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} align="center">Chargement...</TableCell></TableRow>
                        ) : sortedUsers.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">Aucun utilisateur trouvé</TableCell></TableRow>
                        ) : (
                            sortedUsers.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.firstName} {item.lastName}</TableCell>
                                    <TableCell>{item.email}</TableCell>
                                    <TableCell>{item.department}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleEdit(item)}><EditIcon /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id, item.email)}><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={formik.handleSubmit}>
                    <DialogTitle>{editingUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                autoFocus
                                label="Prénom"
                                name="firstName"
                                value={formik.values.firstName}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                                helperText={formik.touched.firstName && formik.errors.firstName as string}
                                fullWidth
                            />
                            <TextField
                                label="Nom"
                                name="lastName"
                                value={formik.values.lastName}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                                helperText={formik.touched.lastName && formik.errors.lastName as string}
                                fullWidth
                            />
                            <TextField
                                label="Email"
                                name="email"
                                type="email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.email && Boolean(formik.errors.email)}
                                helperText={formik.touched.email && formik.errors.email as string}
                                fullWidth
                            />
                            <Autocomplete
                                freeSolo
                                options={departmentOptions}
                                inputValue={formik.values.department}
                                onInputChange={(_, newInputValue) => {
                                    formik.setFieldValue('department', newInputValue);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Département"
                                        name="department"
                                        placeholder="Choisir ou saisir un département"
                                    />
                                )}
                            />
                            <TextField
                                label="Date d'embauche"
                                name="hireDate"
                                type="date"
                                value={formik.values.hireDate}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Annuler</Button>
                        <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
                            {editingUser ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Users;
