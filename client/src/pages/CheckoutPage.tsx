import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Container,
    Stepper,
    Step,
    StepLabel,
    Button,
    TextField,
    MenuItem,
    Grid,
    Card,
    CardContent,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Alert,
    CircularProgress,
    Autocomplete,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    FormControlLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ClearAll as ClearAllIcon,
    CheckCircle as CheckCircleIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { loanApi, equipmentApi, usersApi, accountTypesApi } from '../api/client';
import { Condition } from '../types';
import ConditionSelector from '../components/ConditionSelector';

// Department options
const DEPARTMENTS = [
    'IT',
    'RH',
    'Finance',
    'Marketing',
    'Commercial',
    'Direction',
    'Production',
    'Logistique',
    'Autre',
];

// Brand options
const BRANDS = [
    'Dell',
    'HP',
    'Lenovo',
    'Apple',
    'Samsung',
    'Microsoft',
    'Logitech',
    'Autre',
];

interface EquipmentItem {
    equipmentId: string;
    conditionOut: Condition;
    notes: string;
}

interface CheckoutFormValues {
    collaborator: {
        email: string;
        lastName: string;
        firstName: string;
        department: string;
        loanDate: string;
    };
    equipment: EquipmentItem[];
    accounts: string[];
    checkoutNotes: string;
    itStaffName: string;
}

const validationSchema = Yup.object({
    collaborator: Yup.object({
        email: Yup.string()
            .email('Email invalide')
            .required('Email requis')
            .matches(/@geb\.fr$/, 'Email doit être un email GEB (@geb.fr)'),
        lastName: Yup.string().required('Nom requis'),
        firstName: Yup.string().required('Prénom requis'),
        department: Yup.string().required('Département requis'),
        loanDate: Yup.date()
            .max(new Date(), 'La date ne peut pas être dans le futur')
            .nullable(),
    }),
    equipment: Yup.array()
        .of(
            Yup.object({
                equipmentId: Yup.string().required('Équipement requis'),
                conditionOut: Yup.string()
                    .oneOf(Object.values(Condition))
                    .required('État requis'),
                notes: Yup.string(),
            })
        )
        .min(1, 'Au moins un équipement est requis'),
    accounts: Yup.array().of(Yup.string()),
    checkoutNotes: Yup.string(),
    itStaffName: Yup.string().required('Nom du personnel IT requis'),
});

const CheckoutPage: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [showAddEquipmentDialog, setShowAddEquipmentDialog] = useState(false);
    const [newEquipmentForm, setNewEquipmentForm] = useState({
        serialNumber: '',
        brand: '',
        model: '',
        typeId: '',
        condition: Condition.GOOD,
    });
    const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
    const [newAccountForm, setNewAccountForm] = useState({
        name: '',
        description: '',
    });

    const { data: availableEquipment = [] } = useQuery({
        queryKey: ['available-equipment'],
        queryFn: async () => {
            const response = await equipmentApi.getAvailable();
            return response.data;
        },
    });

    const { data: equipmentTypes = [] } = useQuery({
        queryKey: ['equipment-types'],
        queryFn: async () => {
            const response = await equipmentApi.getTypes();
            return response.data;
        },
    });

    const { data: usersData = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await usersApi.getAll();
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

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const createEquipmentMutation = useMutation({
        mutationFn: (data: any) => equipmentApi.create(data),
        onSuccess: () => {
            // Refresh available equipment list
            queryClient.invalidateQueries({ queryKey: ['available-equipment'] });
            setShowAddEquipmentDialog(false);
            setNewEquipmentForm({
                serialNumber: '',
                brand: '',
                model: '',
                typeId: '',
                condition: Condition.GOOD,
            });
        },
    });

    const createAccountTypeMutation = useMutation({
        mutationFn: (data: any) => accountTypesApi.create(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['accountTypes'] });
            setShowAddAccountDialog(false);
            setNewAccountForm({ name: '', description: '' });
            // Optionally, select the newly created account type automatically
            if (response?.data?.id) {
                formik.setFieldValue('accounts', [...formik.values.accounts, response.data.id]);
            }
        },
    });

    const checkoutMutation = useMutation({
        mutationFn: (data: any) => loanApi.checkout(data),
        onSuccess: () => {
            // Stop loading state
            formik.setSubmitting(false);
            // Refresh dashboard stats and available equipment
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['available-equipment'] });
            // Redirect to dashboard where the new loan is visible
            navigate('/dashboard', { replace: true });
        },
        onError: () => {
            formik.setSubmitting(false);
        },
    });


    const formik = useFormik<CheckoutFormValues>({
        initialValues: {
            collaborator: {
                email: '',
                lastName: '',
                firstName: '',
                department: '',
                loanDate: '',
            },
            equipment: [],
            accounts: [],
            checkoutNotes: '',
            itStaffName: '',
        },
        validationSchema,
        // Only called when we explicitly trigger it from the "Valider le prêt" button.
        onSubmit: async (values) => {
            const checkoutData = {
                collaborator: {
                    email: values.collaborator.email,
                    lastName: values.collaborator.lastName,
                    firstName: values.collaborator.firstName,
                    department: values.collaborator.department,
                    loanDate: values.collaborator.loanDate || null,
                },
                equipment: values.equipment.map((item) => ({
                    equipmentId: item.equipmentId,
                    conditionOut: item.conditionOut,
                    notes: item.notes || '',
                })),
                accounts: values.accounts,
                checkoutNotes: values.checkoutNotes,
                itStaffName: values.itStaffName,
            };

            checkoutMutation.mutate(checkoutData);
        },
    });

    const steps = [
        'Informations collaborateur',
        'Sélection équipement',
        'Comptes à provisionner',
        'Validation IT',
        'Validation collaborateur',
    ];

    const getConditionLabel = (condition: Condition): string => {
        switch (condition) {
            case Condition.NEW:
                return 'Neuf';
            case Condition.GOOD:
                return 'Bon état';
            case Condition.SLIGHT_WEAR:
                return 'Légère usure';
            case Condition.VISIBLE_WEAR:
                return 'Usure visible';
            case Condition.DAMAGED:
                return 'Endommagé';
            case Condition.LOST:
                return 'Perdu';
            default:
                return condition;
        }
    };

    const handleNext = () => {
        if (activeStep === 0) {
            formik.setFieldTouched('collaborator', true);
            if (!formik.errors.collaborator) {
                setActiveStep(1);
            }
        } else if (activeStep === 1) {
            formik.setFieldTouched('equipment', true);
            if (!formik.errors.equipment) {
                setActiveStep(2);
            }
        } else if (activeStep === 2) {
            setActiveStep(3);
        } else if (activeStep === 3) {
            formik.setFieldTouched('itStaffName', true);
            if (!formik.errors.itStaffName) {
                setActiveStep(4);
            }
        }
    };

    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

    const generateAgreementText = () => {
        const { collaborator, equipment, accounts } = formik.values;
        const equipmentList = equipment
            .map((item, index) => {
                const eq = availableEquipment.find((e: any) => e.id === item.equipmentId);
                if (!eq) return `${index + 1}. Équipement non trouvé`;
                return `${index + 1}. ${eq.type?.name || 'Type'} - ${eq.brand} ${eq.model} (S/N: ${eq.serialNumber})`;
            })
            .join('\n');

        const accountsList = accounts && accounts.length > 0
            ? '\nComptes provisionnés :\n' + accounts.map(id => {
                const type = accountTypesData.find((t: any) => t.id === id);
                return `- ${type?.name || id}`;
            }).join('\n') + '\n'
            : '';

        return `Je soussigné(e) ${collaborator.lastName.toUpperCase()} ${collaborator.firstName}, reconnais avoir reçu le matériel suivant :

${equipmentList}
${accountsList}
Je m'engage à utiliser ce matériel conformément à la charte informatique de l'entreprise GEB et à restituer le matériel dans l'état dans lequel il m'a été fourni.

Date: ${new Date().toLocaleDateString('fr-FR')}`;
    };

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Nouveau prêt de matériel
            </Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <FormikProvider value={formik}>
                {/* Prevent the native form submit from firing automatically;
                    we manually trigger Formik submission only on the last step. */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    {/* Step 1: Collaborator Information */}
                    {activeStep === 0 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Informations du collaborateur
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12 }}>
                                    <Autocomplete
                                        freeSolo
                                        options={usersData}
                                        getOptionLabel={(option: any) =>
                                            typeof option === 'string' ? option : `${option.firstName} ${option.lastName} (${option.email})`
                                        }
                                        onChange={(_, newValue: any) => {
                                            if (newValue && typeof newValue === 'object') {
                                                formik.setValues({
                                                    ...formik.values,
                                                    collaborator: {
                                                        ...formik.values.collaborator,
                                                        email: newValue.email || '',
                                                        firstName: newValue.firstName || '',
                                                        lastName: newValue.lastName || '',
                                                        department: newValue.department || '',
                                                    }
                                                });
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rechercher un utilisateur existant"
                                                helperText="Sélectionnez un utilisateur ou remplissez le formulaire ci-dessous pour en créer un nouveau"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Email *"
                                        name="collaborator.email"
                                        value={formik.values.collaborator.email}
                                        onChange={(e) => {
                                            formik.setFieldValue('collaborator.email', e.target.value);
                                            // Auto-suggest GEB domain
                                            if (!e.target.value.includes('@')) {
                                                // User can type, we'll validate format
                                            }
                                        }}
                                        onBlur={formik.handleBlur}
                                        error={
                                            formik.touched.collaborator?.email &&
                                            Boolean(formik.errors.collaborator?.email)
                                        }
                                        helperText={
                                            formik.touched.collaborator?.email &&
                                            formik.errors.collaborator?.email
                                        }
                                        placeholder="prenom.nom@geb.fr"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Nom *"
                                        name="collaborator.lastName"
                                        value={formik.values.collaborator.lastName}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={
                                            formik.touched.collaborator?.lastName &&
                                            Boolean(formik.errors.collaborator?.lastName)
                                        }
                                        helperText={
                                            formik.touched.collaborator?.lastName &&
                                            formik.errors.collaborator?.lastName
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Prénom *"
                                        name="collaborator.firstName"
                                        value={formik.values.collaborator.firstName}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={
                                            formik.touched.collaborator?.firstName &&
                                            Boolean(formik.errors.collaborator?.firstName)
                                        }
                                        helperText={
                                            formik.touched.collaborator?.firstName &&
                                            formik.errors.collaborator?.firstName
                                        }
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        sx={{ minWidth: 260 }}
                                        select
                                        label="Département / Équipe *"
                                        name="collaborator.department"
                                        value={formik.values.collaborator.department}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={
                                            formik.touched.collaborator?.department &&
                                            Boolean(formik.errors.collaborator?.department)
                                        }
                                        helperText={
                                            formik.touched.collaborator?.department &&
                                            formik.errors.collaborator?.department
                                        }
                                    >
                                        {DEPARTMENTS.map((dept) => (
                                            <MenuItem key={dept} value={dept}>
                                                {dept}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Date de prêt"
                                        name="collaborator.loanDate"
                                        type="date"
                                        value={formik.values.collaborator.loanDate}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        InputLabelProps={{ shrink: true }}
                                        error={
                                            formik.touched.collaborator?.loanDate &&
                                            Boolean(formik.errors.collaborator?.loanDate)
                                        }
                                        helperText={
                                            formik.touched.collaborator?.loanDate &&
                                            formik.errors.collaborator?.loanDate
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    )}

                    {/* Step 2: Equipment Selection */}
                    {activeStep === 1 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h6">Sélection des équipements</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        startIcon={<AddIcon />}
                                        variant="contained"
                                        onClick={() => setShowAddEquipmentDialog(true)}
                                    >
                                        Ajouter un équipement
                                    </Button>
                                    {formik.values.equipment.length > 0 && (
                                        <Button
                                            startIcon={<ClearAllIcon />}
                                            onClick={() => {
                                                formik.setFieldValue('equipment', []);
                                            }}
                                        >
                                            Tout effacer
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                            <Divider sx={{ mb: 3 }} />

                            {/* Available Equipment Table */}
                            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                                Équipements disponibles ({availableEquipment.length})
                            </Typography>
                            <TableContainer sx={{ mb: 3, maxHeight: 400 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox" />
                                            <TableCell>Type</TableCell>
                                            <TableCell>Marque</TableCell>
                                            <TableCell>Modèle</TableCell>
                                            <TableCell>Numéro de série</TableCell>
                                            <TableCell>État</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {availableEquipment.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Aucun équipement disponible
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            availableEquipment.map((eq: any) => {
                                                const isSelected = formik.values.equipment.some(
                                                    (item) => item.equipmentId === eq.id
                                                );
                                                return (
                                                    <TableRow
                                                        key={eq.id}
                                                        hover
                                                        sx={{
                                                            cursor: 'pointer',
                                                            backgroundColor: isSelected
                                                                ? 'action.selected'
                                                                : 'inherit',
                                                        }}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                // Remove from selection
                                                                const newEquipment = formik.values.equipment.filter(
                                                                    (item) => item.equipmentId !== eq.id
                                                                );
                                                                formik.setFieldValue('equipment', newEquipment);
                                                            } else {
                                                                // Add to selection, default condition to current equipment condition
                                                                formik.setFieldValue('equipment', [
                                                                    ...formik.values.equipment,
                                                                    {
                                                                        equipmentId: eq.id,
                                                                        conditionOut: eq.condition || Condition.GOOD,
                                                                        notes: '',
                                                                    },
                                                                ]);
                                                            }
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                icon={<CheckBoxOutlineBlankIcon />}
                                                                checkedIcon={<CheckBoxIcon />}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{eq.type?.name || '-'}</TableCell>
                                                        <TableCell>{eq.brand || '-'}</TableCell>
                                                        <TableCell>{eq.model || '-'}</TableCell>
                                                        <TableCell>{eq.serialNumber || '-'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={getConditionLabel(eq.condition)}
                                                                size="small"
                                                                color={
                                                                    eq.condition === Condition.GOOD ||
                                                                        eq.condition === Condition.NEW
                                                                        ? 'success'
                                                                        : eq.condition === Condition.SLIGHT_WEAR ||
                                                                            eq.condition === Condition.VISIBLE_WEAR
                                                                            ? 'warning'
                                                                            : 'error'
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Selected Equipment */}
                            {formik.values.equipment.length > 0 && (
                                <>
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                                        Équipements sélectionnés ({formik.values.equipment.length})
                                    </Typography>
                                    <FieldArray name="equipment">
                                        {({ remove }) => (
                                            <>
                                                {formik.values.equipment.map((item, index) => {
                                                    const equipment = availableEquipment.find(
                                                        (eq: any) => eq.id === item.equipmentId
                                                    );
                                                    if (!equipment) return null;

                                                    return (
                                                        <Card key={item.equipmentId} sx={{ mb: 2 }}>
                                                            <CardContent>
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        mb: 2,
                                                                    }}
                                                                >
                                                                    <Typography variant="subtitle1">
                                                                        {equipment.type?.name || 'Type'} -{' '}
                                                                        {equipment.brand} {equipment.model} (S/N:{' '}
                                                                        {equipment.serialNumber})
                                                                    </Typography>
                                                                    <IconButton
                                                                        color="error"
                                                                        onClick={() => remove(index)}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </Box>

                                                                <Grid container spacing={2}>
                                                                    <Grid size={{ xs: 12, md: 6 }}>
                                                                        <ConditionSelector
                                                                            value={item.conditionOut}
                                                                            onChange={(value) => {
                                                                                formik.setFieldValue(
                                                                                    `equipment.${index}.conditionOut`,
                                                                                    value
                                                                                );
                                                                            }}
                                                                            required
                                                                        />
                                                                    </Grid>
                                                                    <Grid size={{ xs: 12, md: 6 }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            label="Notes supplémentaires"
                                                                            name={`equipment.${index}.notes`}
                                                                            value={item.notes}
                                                                            onChange={formik.handleChange}
                                                                            multiline
                                                                            rows={2}
                                                                        />
                                                                    </Grid>
                                                                </Grid>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </FieldArray>
                                </>
                            )}

                            {formik.touched.equipment && formik.errors.equipment && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {typeof formik.errors.equipment === 'string'
                                        ? formik.errors.equipment
                                        : 'Veuillez sélectionner au moins un équipement'}
                                </Alert>
                            )}
                        </Paper>
                    )}

                    {/* Step 3: Account Provisioning */}
                    {activeStep === 2 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6">
                                    Comptes à provisionner
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    onClick={() => setShowAddAccountDialog(true)}
                                >
                                    Nouveau compte
                                </Button>
                            </Box>
                            <Divider sx={{ mb: 3 }} />

                            {accountTypesData.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Aucun type de compte configuré. Vous pouvez continuer.
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {accountTypesData.map((type: any) => (
                                        <FormControlLabel
                                            key={type.id}
                                            control={
                                                <Checkbox
                                                    checked={formik.values.accounts.includes(type.id)}
                                                    onChange={(e) => {
                                                        const currentAccounts = [...formik.values.accounts];
                                                        if (e.target.checked) {
                                                            currentAccounts.push(type.id);
                                                        } else {
                                                            const idx = currentAccounts.indexOf(type.id);
                                                            if (idx > -1) {
                                                                currentAccounts.splice(idx, 1);
                                                            }
                                                        }
                                                        formik.setFieldValue('accounts', currentAccounts);
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body1">{type.name}</Typography>
                                                    {type.description && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {type.description}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    )}

                    {/* Step 4: IT validation (IT technician enters name and optional notes) */}
                    {activeStep === 3 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Validation IT
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Notes de checkout (optionnel)"
                                        name="checkoutNotes"
                                        value={formik.values.checkoutNotes}
                                        onChange={formik.handleChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Nom du personnel IT *"
                                        name="itStaffName"
                                        value={formik.values.itStaffName}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={
                                            formik.touched.itStaffName &&
                                            Boolean(formik.errors.itStaffName)
                                        }
                                        helperText={
                                            formik.touched.itStaffName && formik.errors.itStaffName
                                        }
                                    />
                                </Grid>
                            </Grid>

                            {/* Show the convention text already on the IT validation step */}
                            <Box
                                sx={{
                                    mt: 3,
                                    p: 2,
                                    backgroundColor: 'grey.50',
                                    borderRadius: 1,
                                    whiteSpace: 'pre-line',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {generateAgreementText()}
                            </Box>
                        </Paper>
                    )}

                    {/* Step 5: Agreement Preview for collaborator validation */}
                    {activeStep === 4 && (
                        <>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Aperçu de la convention de prêt
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                <Box
                                    sx={{
                                        p: 2,
                                        backgroundColor: 'grey.50',
                                        borderRadius: 1,
                                        whiteSpace: 'pre-line',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {generateAgreementText()}
                                </Box>
                            </Paper>
                        </>
                    )}

                    {/* Error Display */}
                    {checkoutMutation.isError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            Erreur lors de la création du prêt. Veuillez réessayer.
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            variant="outlined"
                        >
                            Retour
                        </Button>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {activeStep < steps.length - 1 ? (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    variant="contained"
                                >
                                    Suivant
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="contained"
                                    disabled={formik.isSubmitting || checkoutMutation.isPending}
                                    onClick={() => formik.handleSubmit()}
                                    startIcon={
                                        formik.isSubmitting || checkoutMutation.isPending ? (
                                            <CircularProgress size={20} />
                                        ) : (
                                            <CheckCircleIcon />
                                        )
                                    }
                                >
                                    Valider le prêt
                                </Button>
                            )}
                        </Box>
                    </Box>
                </form>
            </FormikProvider>

            {/* Add New Equipment Dialog */}
            <Dialog
                open={showAddEquipmentDialog}
                onClose={() => setShowAddEquipmentDialog(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        minWidth: '600px',
                        maxWidth: '800px',
                    },
                }}
            >
                <DialogTitle sx={{ pb: 3, pt: 3, fontSize: '1.5rem', fontWeight: 600 }}>
                    Ajouter un nouvel équipement
                </DialogTitle>
                <DialogContent sx={{ px: 4, py: 3 }}>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                size="medium"
                                label="Numéro d'inventaire *"
                                value={newEquipmentForm.serialNumber}
                                onChange={(e) =>
                                    setNewEquipmentForm({
                                        ...newEquipmentForm,
                                        serialNumber: e.target.value,
                                    })
                                }
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: '1.125rem',
                                        padding: '18px 16px',
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: '1rem',
                                    },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                size="medium"
                                select
                                label="Type d'équipement *"
                                value={newEquipmentForm.typeId}
                                onChange={(e) =>
                                    setNewEquipmentForm({
                                        ...newEquipmentForm,
                                        typeId: e.target.value,
                                    })
                                }
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: '1.125rem',
                                        padding: '18px 16px',
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: '1rem',
                                    },
                                }}
                            >
                                {equipmentTypes.map((type: any) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Autocomplete
                                freeSolo
                                options={BRANDS}
                                value={newEquipmentForm.brand}
                                onInputChange={(_, value) =>
                                    setNewEquipmentForm({
                                        ...newEquipmentForm,
                                        brand: value,
                                    })
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="medium"
                                        label="Marque *"
                                        sx={{
                                            '& .MuiInputBase-input': {
                                                fontSize: '1.125rem',
                                                padding: '18px 16px',
                                            },
                                            '& .MuiInputLabel-root': {
                                                fontSize: '1rem',
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                size="medium"
                                label="Modèle *"
                                value={newEquipmentForm.model}
                                onChange={(e) =>
                                    setNewEquipmentForm({
                                        ...newEquipmentForm,
                                        model: e.target.value,
                                    })
                                }
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: '1.125rem',
                                        padding: '18px 16px',
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: '1rem',
                                    },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <ConditionSelector
                                value={newEquipmentForm.condition}
                                onChange={(value) =>
                                    setNewEquipmentForm({
                                        ...newEquipmentForm,
                                        condition: value,
                                    })
                                }
                                required
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 4, pb: 3, pt: 2 }}>
                    <Button onClick={() => setShowAddEquipmentDialog(false)}>Annuler</Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (
                                !newEquipmentForm.serialNumber ||
                                !newEquipmentForm.typeId ||
                                !newEquipmentForm.brand ||
                                !newEquipmentForm.model
                            ) {
                                return;
                            }
                            await createEquipmentMutation.mutateAsync({
                                serialNumber: newEquipmentForm.serialNumber,
                                typeId: newEquipmentForm.typeId,
                                brand: newEquipmentForm.brand,
                                model: newEquipmentForm.model,
                                condition: newEquipmentForm.condition,
                            });
                        }}
                        disabled={createEquipmentMutation.isPending}
                    >
                        {createEquipmentMutation.isPending ? (
                            <CircularProgress size={20} />
                        ) : (
                            'Ajouter'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add New Account Type Dialog */}
            <Dialog
                open={showAddAccountDialog}
                onClose={() => setShowAddAccountDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Nouveau type de compte</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                autoFocus
                                fullWidth
                                label="Nom du compte *"
                                value={newAccountForm.name}
                                onChange={(e) =>
                                    setNewAccountForm({
                                        ...newAccountForm,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Description (optionnelle)"
                                value={newAccountForm.description}
                                onChange={(e) =>
                                    setNewAccountForm({
                                        ...newAccountForm,
                                        description: e.target.value,
                                    })
                                }
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAddAccountDialog(false)}>Annuler</Button>
                    <Button
                        variant="contained"
                        disabled={!newAccountForm.name || createAccountTypeMutation.isPending}
                        onClick={() => {
                            createAccountTypeMutation.mutate({
                                name: newAccountForm.name,
                                description: newAccountForm.description,
                            });
                        }}
                    >
                        {createAccountTypeMutation.isPending ? <CircularProgress size={24} /> : 'Créer'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
};

export default CheckoutPage;
