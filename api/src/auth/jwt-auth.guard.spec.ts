import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';

const requestContext = (path: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ path }),
    }),
  }) as any;

describe('JwtAuthGuard reseller isolation', () => {
  const guard = new JwtAuthGuard();

  it('permite al Revendedor usar solo el API aislado de Revendedores', () => {
    const user = { id: 'user-1', role: Role.REVENDEDOR };

    expect(guard.handleRequest(null, user, null, requestContext('/reseller/catalog'))).toBe(user);
  });

  it('bloquea a un Revendedor de rutas privadas de joyería', () => {
    expect(() =>
      guard.handleRequest(
        null,
        { id: 'user-1', role: Role.REVENDEDOR },
        null,
        requestContext('/kanban/orders'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('mantiene la respuesta no autorizada cuando Passport no resuelve usuario', () => {
    expect(() => guard.handleRequest(null, null, null, requestContext('/reseller/catalog'))).toThrow(
      UnauthorizedException,
    );
  });
});
