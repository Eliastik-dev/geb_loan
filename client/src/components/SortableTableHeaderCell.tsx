import React from 'react';
import { TableCell, TableSortLabel, type TableCellProps } from '@mui/material';
import type { SortOrder } from '../hooks/useTableSort';

export interface SortableTableHeaderCellProps extends Omit<TableCellProps, 'sortDirection'> {
    columnId: string;
    orderBy: string | null;
    order: SortOrder;
    onRequestSort: (columnId: string) => void;
}

const SortableTableHeaderCell: React.FC<SortableTableHeaderCellProps> = ({
    columnId,
    orderBy,
    order,
    onRequestSort,
    children,
    ...tableCellProps
}) => {
    const active = orderBy === columnId;
    return (
        <TableCell {...tableCellProps} sortDirection={active ? order : false}>
            <TableSortLabel active={active} direction={order} onClick={() => onRequestSort(columnId)}>
                {children}
            </TableSortLabel>
        </TableCell>
    );
};

export default SortableTableHeaderCell;
