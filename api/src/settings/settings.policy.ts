import { BadRequestException } from '@nestjs/common';

const SECRET_KEY_PATTERN = /(key|token|secret|password|passwd|credential)/i;
const VALID_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_KEYS = 200;
const MAX_VALUE_LENGTH = 5_000_000;

export function isSecretSettingKey(key: string): boolean {
    return SECRET_KEY_PATTERN.test(key);
}

export function redactSecretSettings(settings: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
        if (!isSecretSettingKey(key)) result[key] = value;
    }
    return result;
}

function assertSafeUrl(key: string, value: string) {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new BadRequestException(`El valor de "${key}" no es una URL válida`);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new BadRequestException(`El valor de "${key}" debe usar http o https`);
    }
    if (url.username || url.password) {
        throw new BadRequestException(`El valor de "${key}" no puede incluir credenciales en la URL`);
    }
    if (/^169\.254\./.test(url.hostname) || url.hostname === 'metadata.google.internal') {
        throw new BadRequestException(`El valor de "${key}" apunta a un destino no permitido`);
    }
}

export function validateSettingsPayload(body: unknown): Record<string, string> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new BadRequestException('Formato de ajustes inválido');
    }
    const entries = Object.entries(body as Record<string, unknown>);
    if (entries.length > MAX_KEYS) {
        throw new BadRequestException('Demasiados ajustes en una sola solicitud');
    }

    const clean: Record<string, string> = {};
    for (const [key, raw] of entries) {
        if (!VALID_KEY_PATTERN.test(key)) {
            throw new BadRequestException(`Nombre de ajuste inválido: "${key.slice(0, 40)}"`);
        }
        if (raw !== null && typeof raw === 'object') {
            throw new BadRequestException(`El valor de "${key}" debe ser texto`);
        }
        const value = raw === null || raw === undefined ? '' : String(raw);
        if (value.length > MAX_VALUE_LENGTH) {
            throw new BadRequestException(`El valor de "${key}" es demasiado grande`);
        }
        if (/_url$/i.test(key) && value.trim() !== '') {
            assertSafeUrl(key, value.trim());
        }
        clean[key] = value;
    }
    return clean;
}
