const DEFAULT_ALLOWED_ORIGINS = [
    'https://luxuryos.pitayacode.io',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;

export function isOriginAllowed(origin?: string): boolean {
    if (!origin) return true;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
    try {
        const url = new URL(origin);
        return url.protocol === 'https:' && url.hostname.endsWith('.pitayacode.io');
    } catch {
        return false;
    }
}
