import { AURA_TOKEN_TTL_SECONDS, signAuraToken, verifyAuraToken } from './aura-token';

const SECRET = 'test-secret-test-secret-test-secret-123';
const ctx = { tenantId: 'tenant-1', userId: 'user-1', role: 'VENDEDOR', email: 'ventas@cared.test' };

describe('aura-token', () => {
  it('firma y verifica un token válido devolviendo el contexto', () => {
    const token = signAuraToken(ctx, SECRET);
    expect(verifyAuraToken(token, SECRET)).toEqual(ctx);
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = signAuraToken(ctx, SECRET);
    expect(verifyAuraToken(token, 'otro-secreto-otro-secreto-otro-secreto')).toBeNull();
  });

  it('rechaza un token manipulado (cambio de rol o tenant)', () => {
    const [, signature] = signAuraToken(ctx, SECRET).split('.');
    const forged = Buffer.from(JSON.stringify({ tid: 'tenant-2', role: 'ADMIN', exp: 9999999999 })).toString('base64url');
    expect(verifyAuraToken(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it('rechaza un token vencido', () => {
    const now = Date.now();
    const token = signAuraToken(ctx, SECRET, now);
    expect(verifyAuraToken(token, SECRET, now + (AURA_TOKEN_TTL_SECONDS + 1) * 1000)).toBeNull();
    expect(verifyAuraToken(token, SECRET, now + (AURA_TOKEN_TTL_SECONDS - 1) * 1000)).toEqual(ctx);
  });

  it('rechaza tokens vacíos o con formato inválido', () => {
    expect(verifyAuraToken(undefined, SECRET)).toBeNull();
    expect(verifyAuraToken('', SECRET)).toBeNull();
    expect(verifyAuraToken('abc', SECRET)).toBeNull();
    expect(verifyAuraToken('a.b.c', SECRET)).toBeNull();
    expect(verifyAuraToken(signAuraToken(ctx, SECRET), '')).toBeNull();
  });
});
