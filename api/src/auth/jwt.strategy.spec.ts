import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy account revocation', () => {
  const prisma: any = {
    user: { findFirst: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-with-enough-entropy';
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
  } as unknown as ConfigService;
  const strategy = new JwtStrategy(config, prisma);

  beforeEach(() => jest.clearAllMocks());

  it('reloads the active user so existing JWTs are revoked immediately', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'revendedor@cared.mx',
      tenantId: 'tenant-1',
      role: Role.REVENDEDOR,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: Role.REVENDEDOR,
      }),
    ).resolves.toMatchObject({ id: 'user-1', role: Role.REVENDEDOR });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', tenantId: 'tenant-1', isActive: true },
      select: { id: true, email: true, tenantId: true, role: true },
    });
  });

  it('rejects a JWT when the account is inactive or missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'user-1', tenantId: 'tenant-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
