import React, { useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    Divider,
    Tooltip,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Category as CategoryIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '../api/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Condition, EquipmentStatus } from '../types';
import { conditionLabels, conditionColors } from '../components/ConditionSelector';
import { useTableSort } from '../hooks/useTableSort';
import SortableTableHeaderCell from '../components/SortableTableHeaderCell';

const EquipmentInventory: React.FC = () => {
    const [openEquipmentDialog, setOpenEquipmentDialog] = React.useState(false);
    const [openTypeDialog, setOpenTypeDialog] = React.useState(false);
    const [editingEquipment, setEditingEquipment] = React.useState<any>(null);
    const [deletingEquipment, setDeletingEquipment] = React.useState<any>(null);
    const [deleteError, setDeleteError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');
    const queryClient = useQueryClient();

    const { data: equipment = [], isLoading } = useQuery({
        queryKey: ['equipment'],
        queryFn: async () => {
            const response = await equipmentApi.getAll();
            return response.data;
        },
    });

    const { data: types = [] } = useQuery({
        queryKey: ['equipment-types'],
        queryFn: async () => {
            const response = await equipmentApi.getTypes();
            return response.data;
        },
    });

    const createEquipmentMutation = useMutation({
        mutationFn: equipmentApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            setOpenEquipmentDialog(false);
            setEditingEquipment(null);
            equipmentFormik.resetForm();
        },
    });

    const updateEquipmentMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            equipmentApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            setOpenEquipmentDialog(false);
            setEditingEquipment(null);
            equipmentFormik.resetForm();
        },
    });

    const deleteEquipmentMutation = useMutation({
        mutationFn: (id: string) => equipmentApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            setDeletingEquipment(null);
            setDeleteError(null);
        },
        onError: (err: any) => {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Suppression impossible';
            setDeleteError(String(msg));
        },
    });

    const createTypeMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            equipmentApi.createType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment-types'] });
            typeFormik.resetForm();
        },
    });

    const equipmentFormik = useFormik({
        initialValues: {
            serialNumber: '',
            serviceTag: '',
            brand: '',
            model: '',
            typeId: '',
            condition: Condition.GOOD,
            currentStatus: EquipmentStatus.AVAILABLE,
            comments: '',
        },
        validationSchema: Yup.object({
            serialNumber: Yup.string().required('Numéro d\'inventaire requis'),
            serviceTag: Yup.string(),
            brand: Yup.string().required('Marque requise'),
            model: Yup.string().required('Modèle requis'),
            typeId: Yup.string().required('Type requis'),
            condition: Yup.string().oneOf(Object.values(Condition)).required('État requis'),
            currentStatus: Yup.string()
                .oneOf(Object.values(EquipmentStatus))
                .required('Statut requis'),
        }),
        onSubmit: (values) => {
            if (editingEquipment) {
                updateEquipmentMutation.mutate({ id: editingEquipment.id, data: values });
            } else {
                createEquipmentMutation.mutate(values);
            }
        },
    });

    const handleEdit = (equipment: any) => {
        setEditingEquipment(equipment);
        equipmentFormik.setValues({
            serialNumber: equipment.serialNumber,
            serviceTag: equipment.serviceTag ?? '',
            brand: equipment.brand,
            model: equipment.model,
            typeId: equipment.typeId,
            condition: equipment.condition,
            currentStatus: equipment.currentStatus,
            comments: equipment.comments ?? '',
        });
        setOpenEquipmentDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenEquipmentDialog(false);
        setEditingEquipment(null);
        equipmentFormik.resetForm();
    };

    const handleAskDelete = (equipment: any) => {
        setDeleteError(null);
        setDeletingEquipment(equipment);
    };

    const handleCloseDeleteDialog = () => {
        if (deleteEquipmentMutation.isPending) return;
        setDeletingEquipment(null);
        setDeleteError(null);
    };

    const typeFormik = useFormik({
        initialValues: {
            name: '',
            description: '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Nom du type requis'),
        }),
        onSubmit: (values) => {
            createTypeMutation.mutate(values);
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'success';
            case 'ON_LOAN':
                return 'warning';
            case 'MAINTENANCE':
                return 'error';
            case 'RETIRED':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'Disponible';
            case 'ON_LOAN':
                return 'En prêt';
            case 'MAINTENANCE':
                return 'Maintenance';
            case 'RETIRED':
                return 'Retiré';
            default:
                return status;
        }
    };

    const filteredEquipment = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return equipment;

        return equipment.filter((item: any) => {
            const haystack = [
                item?.type?.name,
                item?.brand,
                item?.model,
                item?.serialNumber,
                item?.serviceTag,
                getStatusLabel(item?.currentStatus),
                item?.currentStatus,
            ]
                .filter((v) => typeof v === 'string' && v.trim().length > 0)
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [equipment, search]);

    const getEquipmentSortValue = useCallback((item: any, col: string) => {
        switch (col) {
            case 'type':
                return item.type?.name ?? '';
            case 'brand':
                return item.brand ?? '';
            case 'model':
                return item.model ?? '';
            case 'serial':
                return item.serialNumber ?? '';
            case 'serviceTag':
                return item.serviceTag ?? '';
            case 'comments':
                return item.comments ?? '';
            case 'status':
                return getStatusLabel(item?.currentStatus);
            case 'condition':
                return conditionLabels[item.condition as Condition] ?? String(item.condition ?? '');
            default:
                return '';
        }
    }, []);

    const {
        sortedRows: sortedEquipment,
        orderBy: equipOrderBy,
        order: equipOrder,
        requestSort: requestEquipSort,
    } = useTableSort(filteredEquipment, getEquipmentSortValue);

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <Typography variant="h4">Inventaire du matériel</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CategoryIcon />}
                        onClick={() => setOpenTypeDialog(true)}
                    >
                        Gérer les types
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditingEquipment(null);
                            equipmentFormik.resetForm();
                            setOpenEquipmentDialog(true);
                        }}
                    >
                        Ajouter du matériel
                    </Button>
                </Box>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (type, marque, modèle, n° inventaire, service tag, statut...)"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: search ? (
                            <InputAdornment position="end">
                                <Tooltip title="Effacer">
                                    <Button
                                        onClick={() => setSearch('')}
                                        size="small"
                                        sx={{ minWidth: 0, px: 1 }}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {sortedEquipment.length} résultat{sortedEquipment.length > 1 ? 's' : ''} (sur {equipment.length})
                </Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <SortableTableHeaderCell
                                columnId="type"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Type
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="brand"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Marque
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="model"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Modèle
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="serial"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Numéro d'inventaire
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="serviceTag"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Service Tag
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="comments"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Commentaires
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="status"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                Statut
                            </SortableTableHeaderCell>
                            <SortableTableHeaderCell
                                columnId="condition"
                                orderBy={equipOrderBy}
                                order={equipOrder}
                                onRequestSort={requestEquipSort}
                            >
                                État
                            </SortableTableHeaderCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    Chargement...
                                </TableCell>
                            </TableRow>
                        ) : sortedEquipment.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    {equipment.length === 0
                                        ? 'Aucun équipement trouvé'
                                        : 'Aucun résultat pour cette recherche'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedEquipment.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.type.name}</TableCell>
                                    <TableCell>{item.brand}</TableCell>
                                    <TableCell>{item.model}</TableCell>
                                    <TableCell>{item.serialNumber}</TableCell>
                                    <TableCell>{item.serviceTag || '—'}</TableCell>
                                    <TableCell>
                                        {item.comments && item.comments.trim().length > 0
                                            ? item.comments
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(item.currentStatus)}
                                            color={getStatusColor(item.currentStatus)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={conditionLabels[item.condition as Condition]}
                                            color={conditionColors[item.condition as Condition] as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            startIcon={<EditIcon />}
                                            onClick={() => handleEdit(item)}
                                            variant="outlined"
                                            sx={{ mr: 1 }}
                                        >
                                            Modifier
                                        </Button>
                                        <Tooltip
                                            title={
                                                item.currentStatus !== EquipmentStatus.AVAILABLE
                                                    ? "Suppression possible uniquement si le statut est « Disponible »"
                                                    : ''
                                            }
                                            arrow
                                        >
                                            <span>
                                                <Button
                                                    size="small"
                                                    startIcon={<DeleteIcon />}
                                                    color="error"
                                                    variant="outlined"
                                                    onClick={() => handleAskDelete(item)}
                                                    disabled={item.currentStatus !== EquipmentStatus.AVAILABLE}
                                                >
                                                    Supprimer
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Equipment Dialog */}
            <Dialog
                open={openEquipmentDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <form onSubmit={equipmentFormik.handleSubmit}>
                    <DialogTitle>
                        {editingEquipment ? 'Modifier un équipement' : 'Ajouter un équipement'}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                select
                                label="Type d'équipement"
                                name="typeId"
                                value={equipmentFormik.values.typeId}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                error={
                                    equipmentFormik.touched.typeId &&
                                    Boolean(equipmentFormik.errors.typeId)
                                }
                                helperText={
                                    equipmentFormik.touched.typeId && equipmentFormik.errors.typeId
                                }
                                fullWidth
                            >
                                {types.map((type: any) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Marque"
                                name="brand"
                                value={equipmentFormik.values.brand}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                error={
                                    equipmentFormik.touched.brand &&
                                    Boolean(equipmentFormik.errors.brand)
                                }
                                helperText={
                                    equipmentFormik.touched.brand && equipmentFormik.errors.brand
                                }
                                fullWidth
                            />

                            <TextField
                                label="Modèle"
                                name="model"
                                value={equipmentFormik.values.model}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                error={
                                    equipmentFormik.touched.model &&
                                    Boolean(equipmentFormik.errors.model)
                                }
                                helperText={
                                    equipmentFormik.touched.model && equipmentFormik.errors.model
                                }
                                fullWidth
                            />

                            <TextField
                                label="Numéro d'inventaire"
                                name="serialNumber"
                                value={equipmentFormik.values.serialNumber}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                error={
                                    equipmentFormik.touched.serialNumber &&
                                    Boolean(equipmentFormik.errors.serialNumber)
                                }
                                helperText={
                                    equipmentFormik.touched.serialNumber &&
                                    equipmentFormik.errors.serialNumber
                                }
                                fullWidth
                            />

                            <TextField
                                label="Service Tag"
                                name="serviceTag"
                                value={equipmentFormik.values.serviceTag}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                helperText="Identifiant constructeur (optionnel)"
                                fullWidth
                            />

                            <TextField
                                select
                                label="État / Dégradation"
                                name="condition"
                                value={equipmentFormik.values.condition}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                error={
                                    equipmentFormik.touched.condition &&
                                    Boolean(equipmentFormik.errors.condition)
                                }
                                helperText={
                                    equipmentFormik.touched.condition &&
                                    equipmentFormik.errors.condition
                                }
                                fullWidth
                            >
                                <MenuItem value={Condition.NEW}>Neuf</MenuItem>
                                <MenuItem value={Condition.GOOD}>Bon</MenuItem>
                                <MenuItem value={Condition.SLIGHT_WEAR}>Légère usure</MenuItem>
                                <MenuItem value={Condition.VISIBLE_WEAR}>Usure visible</MenuItem>
                                <MenuItem value={Condition.DAMAGED}>Endommagé</MenuItem>
                                <MenuItem value={Condition.LOST}>Perdu</MenuItem>
                            </TextField>

                            {editingEquipment && (
                                <TextField
                                    select
                                    label="Statut"
                                    name="currentStatus"
                                    value={equipmentFormik.values.currentStatus}
                                    onChange={equipmentFormik.handleChange}
                                    onBlur={equipmentFormik.handleBlur}
                                    error={
                                        equipmentFormik.touched.currentStatus &&
                                        Boolean(equipmentFormik.errors.currentStatus)
                                    }
                                    helperText={
                                        equipmentFormik.touched.currentStatus &&
                                        equipmentFormik.errors.currentStatus
                                    }
                                    fullWidth
                                >
                                    <MenuItem value={EquipmentStatus.AVAILABLE}>Disponible</MenuItem>
                                    <MenuItem value={EquipmentStatus.ON_LOAN}>En prêt</MenuItem>
                                    <MenuItem value={EquipmentStatus.MAINTENANCE}>
                                        Maintenance
                                    </MenuItem>
                                    <MenuItem value={EquipmentStatus.RETIRED}>Retiré</MenuItem>
                                </TextField>
                            )}

                            <TextField
                                label="Commentaires"
                                name="comments"
                                value={equipmentFormik.values.comments}
                                onChange={equipmentFormik.handleChange}
                                onBlur={equipmentFormik.handleBlur}
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Notes internes sur le matériel (état particulier, affectation, historique, etc.)"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Annuler</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={
                                createEquipmentMutation.isPending ||
                                updateEquipmentMutation.isPending
                            }
                        >
                            {editingEquipment ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Equipment Type Management Dialog */}
            <Dialog
                open={openTypeDialog}
                onClose={() => setOpenTypeDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Gérer les types d'équipement</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Types existants ({types.length})
                        </Typography>
                        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                            <List dense>
                                {types.length === 0 ? (
                                    <ListItem>
                                        <ListItemText
                                            primary="Aucun type d'équipement"
                                            secondary="Ajoutez votre premier type ci-dessous"
                                        />
                                    </ListItem>
                                ) : (
                                    types.map((type: any) => (
                                        <ListItem key={type.id}>
                                            <ListItemText
                                                primary={type.name}
                                                secondary={type.description || 'Pas de description'}
                                            />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </Paper>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box component="form" onSubmit={typeFormik.handleSubmit}>
                        <Typography variant="subtitle2" gutterBottom>
                            Ajouter un nouveau type
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Nom du type"
                                name="name"
                                value={typeFormik.values.name}
                                onChange={typeFormik.handleChange}
                                onBlur={typeFormik.handleBlur}
                                error={typeFormik.touched.name && Boolean(typeFormik.errors.name)}
                                helperText={typeFormik.touched.name && typeFormik.errors.name}
                                placeholder="Ex: Casque, Souris, Clavier..."
                                fullWidth
                            />

                            <TextField
                                label="Description (optionnelle)"
                                name="description"
                                value={typeFormik.values.description}
                                onChange={typeFormik.handleChange}
                                onBlur={typeFormik.handleBlur}
                                placeholder="Ex: Casque audio avec micro"
                                fullWidth
                                multiline
                                rows={2}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<AddIcon />}
                                disabled={createTypeMutation.isPending}
                                fullWidth
                            >
                                Ajouter le type
                            </Button>

                            {createTypeMutation.isSuccess && (
                                <Typography color="success.main" variant="caption">
                                    ✓ Type ajouté avec succès!
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTypeDialog(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Equipment Confirmation Dialog */}
            <Dialog
                open={Boolean(deletingEquipment)}
                onClose={handleCloseDeleteDialog}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Supprimer cet équipement ?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Cette action est irréversible.
                    </Typography>

                    {deletingEquipment && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">
                                {deletingEquipment.type?.name || 'Type'} - {deletingEquipment.brand}{' '}
                                {deletingEquipment.model}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                N° inventaire : {deletingEquipment.serialNumber}
                                {deletingEquipment.serviceTag
                                    ? ` · Service Tag : ${deletingEquipment.serviceTag}`
                                    : ''}
                            </Typography>
                        </Box>
                    )}

                    {deleteError && (
                        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                            {deleteError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={deleteEquipmentMutation.isPending}>
                        Annuler
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={!deletingEquipment || deleteEquipmentMutation.isPending}
                        onClick={() => {
                            if (!deletingEquipment?.id) return;
                            deleteEquipmentMutation.mutate(deletingEquipment.id);
                        }}
                    >
                        Supprimer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EquipmentInventory;
