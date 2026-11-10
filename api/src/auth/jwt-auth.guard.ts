import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest();
    const pathname = String(
      request?.path || request?.originalUrl || request?.url || '',
    );

    // Revendedores only operate through the isolated reseller API. This is
    // enforced at the authentication boundary so a UI route cannot become a
    // security boundary by accident.
    const isResellerRoute =
      pathname === '/reseller' || pathname.startsWith('/reseller/');

    if (user.role === Role.REVENDEDOR && !isResellerRoute) {
      throw new ForbiddenException(
        'El rol Revendedor solo puede acceder al módulo de Revendedores',
      );
    }

    return user;
  }
}
