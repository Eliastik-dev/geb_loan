import React from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { loanApi } from '../api/client';

const validationSchema = Yup.object({
    email: Yup.string().email('Email invalide').required('Email requis'),
    validationCode: Yup.string()
        .length(6, 'Le code doit contenir 6 chiffres')
        .required('Code de validation requis'),
});

const ValidationPage: React.FC = () => {
    const [loan, setLoan] = React.useState<any>(null);

    const getPendingMutation = useMutation({
        mutationFn: ({ email, code }: { email: string; code: string }) =>
            loanApi.getPending(email, code),
        onSuccess: (response) => {
            setLoan(response.data);
        },
    });

    const validateMutation = useMutation({
        mutationFn: (code: string) => loanApi.validateCheckout(code),
        onSuccess: () => {
            formik.resetForm();
            setLoan(null);
        },
    });

    const formik = useFormik({
        initialValues: {
            email: '',
            validationCode: '',
        },
        validationSchema,
        onSubmit: (values) => {
            getPendingMutation.mutate({
                email: values.email,
                code: values.validationCode,
            });
        },
    });

    const handleConfirm = () => {
        if (loan) {
            validateMutation.mutate(loan.validationCode);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 3,
            }}
        >
            <Paper sx={{ p: 4, maxWidth: 600, width: '100%' }}>
                <Typography variant="h4" gutterBottom align="center">
                    Validation de{' '}prêt
                </Typography>

                <Alert severity="info" sx={{ mt: 1, mb: 3 }}>
                    Ce module de validation par code est conservé pour compatibilité
                    mais le flux principal de prêt est désormais validé directement
                    par l&apos;équipe informatique.
                </Alert>

                {!loan ? (
                    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
                        <Typography variant="body1" gutterBottom>
                            Entrez votre email et le code de validation fourni par le service
                            informatique :
                        </Typography>

                        <Box sx={{ mt: 3 }}>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    marginBottom: '16px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                }}
                            />
                            {formik.touched.email && formik.errors.email && (
                                <Typography color="error" variant="caption">
                                    {formik.errors.email}
                                </Typography>
                            )}
                        </Box>

                        <Box>
                            <input
                                type="text"
                                name="validationCode"
                                placeholder="Code de validation (6 chiffres)"
                                value={formik.values.validationCode}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                maxLength={6}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    marginBottom: '16px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                }}
                            />
                            {formik.touched.validationCode &&
                                formik.errors.validationCode && (
                                    <Typography color="error" variant="caption">
                                        {formik.errors.validationCode}
                                    </Typography>
                                )}
                        </Box>

                        {getPendingMutation.isError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                Code de validation ou email invalide
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={getPendingMutation.isPending}
                            sx={{ mt: 2 }}
                        >
                            Vérifier
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ mt: 3 }}>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Veuillez vérifier les informations ci-dessous et confirmer le prêt
                        </Alert>

                        <Typography variant="h6" gutterBottom>
                            Collaborateur
                        </Typography>
                        <Typography>
                            {loan.user.firstName} {loan.user.lastName}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            {loan.user.email}
                        </Typography>

                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                            Matériel emprunté
                        </Typography>
                        {loan.items.map((item: any, index: number) => (
                            <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="subtitle1">
                                    {item.equipment.type.name} - {item.equipment.brand}{' '}
                                    {item.equipment.model}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Numéro de série: {item.equipment.serialNumber}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    État: {item.conditionOut}
                                </Typography>
                            </Box>
                        ))}

                        {validateMutation.isError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                Erreur lors de la validation
                            </Alert>
                        )}

                        {validateMutation.isSuccess && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                Prêt validé avec succès! Vous allez recevoir un email de
                                confirmation.
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => {
                                    setLoan(null);
                                    formik.resetForm();
                                }}
                                disabled={validateMutation.isPending}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleConfirm}
                                disabled={validateMutation.isPending || validateMutation.isSuccess}
                            >
                                Confirmer et signer
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default ValidationPage;
