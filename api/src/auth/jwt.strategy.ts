import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
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

    async validate(payload: any) {
        return { id: payload.sub, email: payload.email, tenantId: payload.tenantId, role: payload.role };
    }
}
