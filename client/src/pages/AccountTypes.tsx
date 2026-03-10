import React from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountTypesApi } from '../api/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AccountTypes: React.FC = () => {
    const [openDialog, setOpenDialog] = React.useState(false);
    const [editingType, setEditingType] = React.useState<any>(null);
    const queryClient = useQueryClient();

    const { data: accountTypes = [], isLoading } = useQuery({
        queryKey: ['accountTypes'],
        queryFn: async () => {
            const response = await accountTypesApi.getAll();
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: accountTypesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountTypes'] });
            handleCloseDialog();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => accountTypesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountTypes'] });
            handleCloseDialog();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: accountTypesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accountTypes'] });
        },
    });

    const formik = useFormik({
        initialValues: {
            name: '',
            description: '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Nom du type requis'),
        }),
        onSubmit: (values) => {
            if (editingType) {
                updateMutation.mutate({ id: editingType.id, data: values });
            } else {
                createMutation.mutate(values);
            }
        },
    });

    const handleEdit = (type: any) => {
        setEditingType(type);
        formik.setValues({
            name: type.name,
            description: type.description || '',
        });
        setOpenDialog(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce type de compte ?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingType(null);
        formik.resetForm();
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Types de comptes</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                    Ajouter un type
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nom</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={3} align="center">Chargement...</TableCell></TableRow>
                        ) : accountTypes.length === 0 ? (
                            <TableRow><TableCell colSpan={3} align="center">Aucun type de compte trouvé</TableCell></TableRow>
                        ) : (
                            accountTypes.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleEdit(item)}><EditIcon /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={formik.handleSubmit}>
                    <DialogTitle>{editingType ? 'Modifier un type' : 'Ajouter un type'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                autoFocus
                                label="Nom du type"
                                name="name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.name && Boolean(formik.errors.name)}
                                helperText={formik.touched.name && formik.errors.name as string}
                                fullWidth
                            />
                            <TextField
                                label="Description"
                                name="description"
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Annuler</Button>
                        <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
                            {editingType ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default AccountTypes;
