import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    const createMockContext = (user: any): ExecutionContext => {
        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
        } as unknown as ExecutionContext;
    };

    it('should allow access when no roles are required', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
        const context = createMockContext({ role: Role.JOYERO });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow SYSTEM_ADMIN to access any protected route', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.TENANT_ADMIN]);
        const context = createMockContext({ role: Role.SYSTEM_ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow TENANT_ADMIN when TENANT_ADMIN is in required roles', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN]);
        const context = createMockContext({ role: Role.TENANT_ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user role is not permitted', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN, Role.TENANT_ADMIN]);
        const context = createMockContext({ role: Role.JOYERO });
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user has no role or is unauthenticated', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.TENANT_ADMIN]);
        const context = createMockContext(null);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
