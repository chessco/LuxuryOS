import { createHmac, timingSafeEqual } from 'crypto';

export interface AuraToolContext {
  tenantId: string;
  userId?: string;
  role?: string;
  email?: string;
}

interface AuraTokenPayload {
  tid: string;
  uid?: string;
  role?: string;
  email?: string;
  exp: number; // segundos unix
}

export const AURA_TOKEN_TTL_SECONDS = 180;

const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest('base64url');

/**
 * Token de corta vida que LuxuryOS entrega a pitayacore para que lo devuelva al ejecutar una herramienta.
 * Pitayacore lo trata como opaco: solo LuxuryOS lo firma y lo verifica.
 */
export function signAuraToken(ctx: AuraToolContext, secret: string, now = Date.now()): string {
  const payload: AuraTokenPayload = {
    tid: ctx.tenantId,
    uid: ctx.userId,
    role: ctx.role,
    email: ctx.email,
    exp: Math.floor(now / 1000) + AURA_TOKEN_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifyAuraToken(token: string | undefined, secret: string, now = Date.now()): AuraToolContext | null {
  if (!token || !secret) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(body, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuraTokenPayload;
    if (!payload.tid || typeof payload.exp !== 'number' || payload.exp * 1000 < now) return null;
    return { tenantId: payload.tid, userId: payload.uid, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}
