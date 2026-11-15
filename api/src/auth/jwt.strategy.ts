import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
    sub: string;
    tenantId: string;
    role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        const isProd = configService.get<string>('NODE_ENV') === 'production';

        if (!secret || secret === 'secret' || secret.trim() === '') {
            if (isProd) {
                throw new Error('SECURITY ERROR: JWT_SECRET must be defined and secure in production!');
            }
            console.warn('[JWT] Warning: JWT_SECRET is not set or insecure. Using local development fallback.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret && secret !== 'secret' ? secret : 'super_secret_luxury_dev_key_do_not_use_in_prod',
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: payload.sub,
                tenantId: payload.tenantId,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                tenantId: true,
                role: true,
            },
        });
        if (!user) {
            throw new UnauthorizedException('La cuenta está inactiva o ya no existe');
        }
        return user;
    }
}
