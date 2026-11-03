import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    Inventory,
    Assignment,
    CheckCircle,
    Schedule,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/client';

interface RecentActivity {
    id: string;
    type: 'CHECKOUT' | 'RETURN';
    occurredAt: string;
    collaboratorName: string;
    department: string | null;
    itStaff: string;
    equipmentLabel: string;
    equipmentCount: number;
}

const activityLabels: Record<RecentActivity['type'], string> = {
    CHECKOUT: 'Sortie',
    RETURN: 'Retour',
};

function formatActivityDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

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
                recentActivity: RecentActivity[];
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

    const recentActivity = data?.recentActivity ?? [];

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
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : isError ? (
                            <Typography variant="body2" color="error">
                                Impossible de charger l&apos;activité récente
                            </Typography>
                        ) : recentActivity.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                Aucune activité récente
                            </Typography>
                        ) : (
                            <List disablePadding>
                                {recentActivity.map((activity, index) => (
                                    <ListItem
                                        key={activity.id}
                                        disableGutters
                                        divider={index < recentActivity.length - 1}
                                        sx={{ py: 1.25, alignItems: 'flex-start' }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        size="small"
                                                        label={activityLabels[activity.type]}
                                                        color={activity.type === 'CHECKOUT' ? 'warning' : 'success'}
                                                    />
                                                    <Typography component="span" variant="body1">
                                                        {activity.collaboratorName}
                                                    </Typography>
                                                    {activity.department ? (
                                                        <Typography component="span" variant="body2" color="text.secondary">
                                                            {activity.department}
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                            }
                                            secondary={
                                                [
                                                    activity.equipmentLabel,
                                                    formatActivityDate(activity.occurredAt),
                                                    activity.itStaff ? `IT : ${activity.itStaff}` : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
