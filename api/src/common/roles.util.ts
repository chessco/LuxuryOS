export const isAdminRole = (role?: string, email?: string): boolean => {
    const r = String(role || '').toUpperCase();
    const e = String(email || '').toLowerCase();
    return (
        r === 'SYSTEM_ADMIN' ||
        r === 'TENANT_ADMIN' ||
        r === 'SYSTEM' ||
        r === 'ADMIN' ||
        r === 'SUPER_ADMIN' ||
        e.includes('system')
    );
};

export const clientIp = (req: any): string =>
    String(req?.ip || req?.socket?.remoteAddress || 'unknown');
