export const isAdminRole = (role?: string): boolean => {
    const r = String(role || '').toUpperCase();
    return r === 'SYSTEM_ADMIN' || r === 'TENANT_ADMIN';
};

export const clientIp = (req: any): string =>
    String(req?.ip || req?.socket?.remoteAddress || 'unknown');
