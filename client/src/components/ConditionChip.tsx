import React from 'react';
import { Chip } from '@mui/material';
import { Condition } from '../types';
import { conditionLabels, conditionColors } from './ConditionSelector';

interface ConditionChipProps {
    value: Condition | string | null | undefined;
    /** Libellé si la valeur est absente */
    emptyLabel?: string;
}

const conditionValues = new Set<string>(Object.values(Condition));

const ConditionChip: React.FC<ConditionChipProps> = ({ value, emptyLabel = '—' }) => {
    if (value == null || value === '') {
        return <span>{emptyLabel}</span>;
    }
    if (conditionValues.has(String(value))) {
        const key = value as Condition;
        return (
            <Chip
                label={conditionLabels[key]}
                color={conditionColors[key] ?? 'default'}
                size="small"
            />
        );
    }
    return <Chip label={String(value)} size="small" variant="outlined" />;
};

export default ConditionChip;
