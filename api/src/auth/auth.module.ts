import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                const isProd = configService.get<string>('NODE_ENV') === 'production';
                if (!secret || secret === 'secret' || secret.trim() === '') {
                    if (isProd) {
                        throw new Error('SECURITY ERROR: JWT_SECRET must be defined and secure in production!');
                    }
                }
                return {
                    secret: secret && secret !== 'secret' ? secret : 'super_secret_luxury_dev_key_do_not_use_in_prod',
                    signOptions: { expiresIn: '1d' },
                };
            },
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService, JwtModule],
})
export class AuthModule { }
