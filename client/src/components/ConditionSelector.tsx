import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Chip,
    Box,
} from '@mui/material';
import { Condition } from '../types';

interface ConditionSelectorProps {
    value: Condition;
    onChange: (value: Condition) => void;
    label?: string;
    error?: boolean;
    helperText?: string;
    required?: boolean;
}

export const conditionLabels: Record<Condition, string> = {
    [Condition.NEW]: 'Neuf',
    [Condition.GOOD]: 'Bon',
    [Condition.SLIGHT_WEAR]: 'Légère usure',
    [Condition.VISIBLE_WEAR]: 'Usure visible',
    [Condition.DAMAGED]: 'Endommagé',
    [Condition.LOST]: 'Perdu',
};

export const conditionColors: Record<Condition, 'success' | 'warning' | 'error' | 'default'> = {
    [Condition.NEW]: 'success',
    [Condition.GOOD]: 'success',
    [Condition.SLIGHT_WEAR]: 'warning',
    [Condition.VISIBLE_WEAR]: 'warning',
    [Condition.DAMAGED]: 'error',
    [Condition.LOST]: 'error',
};

const ConditionSelector: React.FC<ConditionSelectorProps> = ({
    value,
    onChange,
    label = "État / Dégradation",
    error,
    helperText,
    required = false,
}) => {
    return (
        <FormControl fullWidth error={error} required={required}>
            <InputLabel>{label}</InputLabel>
            <Select
                value={value}
                onChange={(e) => onChange(e.target.value as Condition)}
                label={label}
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label={conditionLabels[selected as Condition]}
                            color={conditionColors[selected as Condition]}
                            size="small"
                        />
                    </Box>
                )}
            >
                {Object.values(Condition).map((condition) => (
                    <MenuItem key={condition} value={condition}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label={conditionLabels[condition]}
                                color={conditionColors[condition]}
                                size="small"
                            />
                        </Box>
                    </MenuItem>
                ))}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
};

export default ConditionSelector;

