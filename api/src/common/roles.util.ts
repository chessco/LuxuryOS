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

export const isJoyeroRole = (role?: string, email?: string, name?: string): boolean => {
    const r = String(role || '').toUpperCase();
    const e = String(email || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    return r === 'JOYERO' || e.includes('joyero') || n.includes('joyero');
};

export const isDesignerRole = (role?: string, email?: string, name?: string): boolean => {
    const r = String(role || '').toUpperCase();
    const e = String(email || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    return r === 'DISENADOR' || r === 'DESIGNER' || e.includes('disen') || n.includes('disen') || e.includes('design');
};

export const isVendedorRole = (role?: string, email?: string, name?: string): boolean => {
    const r = String(role || '').toUpperCase();
    const e = String(email || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    return r === 'VENDEDOR' || r === 'VENTAS' || e.includes('vendedor') || e.includes('ventas') || n.includes('vendedor');
};

export const clientIp = (req: any): string =>
    String(req?.ip || req?.socket?.remoteAddress || 'unknown');

