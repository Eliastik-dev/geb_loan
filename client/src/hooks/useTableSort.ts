import { useCallback, useMemo, useState } from 'react';

export type SortOrder = 'asc' | 'desc';

function compareLocale(a: string, b: string): number {
    return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
}

export function useTableSort<T>(
    rows: T[],
    getSortValue: (row: T, columnId: string) => string | number
): {
    sortedRows: T[];
    orderBy: string | null;
    order: SortOrder;
    requestSort: (columnId: string) => void;
} {
    const [orderBy, setOrderBy] = useState<string | null>(null);
    const [order, setOrder] = useState<SortOrder>('asc');

    const requestSort = useCallback((columnId: string) => {
        setOrderBy((prev) => {
            if (prev === columnId) {
                setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setOrder('asc');
            return columnId;
        });
    }, []);

    const sortedRows = useMemo(() => {
        if (!orderBy) return rows;
        return [...rows].sort((a, b) => {
            const av = getSortValue(a, orderBy);
            const bv = getSortValue(b, orderBy);
            const as = av === null || av === undefined ? '' : String(av);
            const bs = bv === null || bv === undefined ? '' : String(bv);
            const cmp = compareLocale(as, bs);
            return order === 'asc' ? cmp : -cmp;
        });
    }, [rows, orderBy, order, getSortValue]);

    return { sortedRows, orderBy, order, requestSort };
}
