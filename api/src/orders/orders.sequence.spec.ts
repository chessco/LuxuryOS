export const formatOrderCode = (order: any, seqIndex?: number) => {
    if (!order) return '';
    const t = (order.type || 'STANDARD').toUpperCase();
    let prefix = 'PED';
    if (t === 'REPAIR') prefix = 'REP';
    else if (t === 'MANUFACTURE') prefix = 'FAB';
    else if (t === 'LAYAWAY') prefix = 'APT';

    let rawCode = order.orderCode || order.specifications?.orderCode || '';
    if (rawCode) {
        const match = String(rawCode).match(/^([A-Z]+)-0*(\d+)$/i);
        if (match) {
            return `${match[1].toUpperCase()}-${match[2]}`;
        }
        return rawCode;
    }

    const seqNum = seqIndex !== undefined ? seqIndex : (order.sequenceNumber || 1);
    return `${prefix}-${seqNum}`;
};

describe('Order Formatting and Sorting Unit Tests', () => {
    describe('formatOrderCode', () => {
        it('should strip leading zero padding from legacy order codes (e.g. FAB-000005 -> FAB-5)', () => {
            const mockOrder1 = { type: 'MANUFACTURE', orderCode: 'FAB-000005' };
            const mockOrder2 = { type: 'REPAIR', specifications: { orderCode: 'REP-000014' } };
            
            expect(formatOrderCode(mockOrder1)).toBe('FAB-5');
            expect(formatOrderCode(mockOrder2)).toBe('REP-14');
        });

        it('should format order code with prefix based on order type when code is absent', () => {
            const fabOrder = { type: 'MANUFACTURE', sequenceNumber: 14 };
            const repOrder = { type: 'REPAIR', sequenceNumber: 6 };
            const aptOrder = { type: 'LAYAWAY', sequenceNumber: 2 };
            const pedOrder = { type: 'STANDARD', sequenceNumber: 10 };

            expect(formatOrderCode(fabOrder)).toBe('FAB-14');
            expect(formatOrderCode(repOrder)).toBe('REP-6');
            expect(formatOrderCode(aptOrder)).toBe('APT-2');
            expect(formatOrderCode(pedOrder)).toBe('PED-10');
        });

        it('should handle order with no orderCode or sequenceNumber gracefully', () => {
            const emptyOrder = { type: 'MANUFACTURE' };
            expect(formatOrderCode(emptyOrder)).toBe('FAB-1');
        });
    });

    describe('Natural Numerical Sequence Sorting', () => {
        const extractSeq = (orderCode: string): number => {
            const digits = orderCode.replace(/[^0-9]/g, '');
            return digits ? parseInt(digits, 10) : 0;
        };

        it('should sort orders numerically (1, 2, 3... 10, 14) instead of lexicographically', () => {
            const unsortedCodes = ['FAB-14', 'FAB-1', 'FAB-10', 'FAB-2', 'FAB-6', 'FAB-20'];
            
            const sortedLexicographically = [...unsortedCodes].sort();
            expect(sortedLexicographically).not.toEqual(['FAB-1', 'FAB-2', 'FAB-6', 'FAB-10', 'FAB-14', 'FAB-20']);

            const sortedNumerically = [...unsortedCodes].sort((a, b) => extractSeq(a) - extractSeq(b));
            expect(sortedNumerically).toEqual(['FAB-1', 'FAB-2', 'FAB-6', 'FAB-10', 'FAB-14', 'FAB-20']);
        });
    });

    describe('Promised Date Conversion', () => {
        const getInputValueForPromisedDate = (order: any) => {
            if (order.promisedAt) {
                try {
                    return new Date(order.promisedAt).toISOString().split('T')[0];
                } catch {}
            }
            const str = order.promisedDate;
            if (!str || str === '—') return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            const parts = str.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            return '';
        };

        it('should convert ISO promisedAt string to YYYY-MM-DD input date value', () => {
            const order = { promisedAt: '2026-10-15T12:00:00.000Z' };
            expect(getInputValueForPromisedDate(order)).toBe('2026-10-15');
        });

        it('should convert DD/MM/YYYY formatted date string to YYYY-MM-DD', () => {
            const order = { promisedDate: '15/10/2026' };
            expect(getInputValueForPromisedDate(order)).toBe('2026-10-15');
        });

        it('should return empty string for unassigned delivery date', () => {
            const order = { promisedDate: '—' };
            expect(getInputValueForPromisedDate(order)).toBe('');
        });
    });
});
