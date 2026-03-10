import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import {
    Inventory,
    Assignment,
    CheckCircle,
    Schedule,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/client';

const Dashboard: React.FC = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await statsApi.getOverview();
            return response.data as {
                availableEquipment: number;
                activeLoans: number;
                returnsThisMonth: number;
                pendingValidations: number;
            };
        },
        refetchInterval: 30000,
    });

    const stats = {
        availableEquipment: data?.availableEquipment ?? 0,
        activeLoans: data?.activeLoans ?? 0,
        returnsThisMonth: data?.returnsThisMonth ?? 0,
        pendingValidations: data?.pendingValidations ?? 0,
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Tableau de bord
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Inventory sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {isLoading ? '...' : stats.availableEquipment}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Équipements disponibles
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Assignment sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {isLoading ? '...' : stats.activeLoans}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Prêts actifs
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {isLoading ? '...' : stats.returnsThisMonth}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Retours ce mois
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Schedule sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                                <Box>
                                    <Typography variant="h4">
                                        {isLoading ? '...' : stats.pendingValidations}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        En attente validation
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Activité récente
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Aucune activité récente
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
