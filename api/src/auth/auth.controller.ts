import { Controller, Post, Body, Req, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthService } from './auth.service';
import { RateLimiter } from '../common/rate-limiter';
import { clientIp } from '../common/roles.util';

class LoginDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(254)
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    password!: string;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

@Controller('auth')
export class AuthController {
    private readonly failuresByIpAndAccount = new RateLimiter(8, FIFTEEN_MINUTES);
    private readonly failuresByAccount = new RateLimiter(40, FIFTEEN_MINUTES);
    private readonly failuresByIp = new RateLimiter(100, FIFTEEN_MINUTES);

    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: LoginDto, @Req() req: any) {
        const ip = clientIp(req);
        const account = body.email.trim().toLowerCase();
        const keys = {
            ipAccount: `${ip}|${account}`,
            account,
            ip,
        };

        if (
            this.failuresByIpAndAccount.isBlocked(keys.ipAccount) ||
            this.failuresByAccount.isBlocked(keys.account) ||
            this.failuresByIp.isBlocked(keys.ip)
        ) {
            throw new HttpException(
                'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            this.failuresByIpAndAccount.hit(keys.ipAccount);
            this.failuresByAccount.hit(keys.account);
            this.failuresByIp.hit(keys.ip);
            throw new UnauthorizedException('Credenciales inválidas');
        }

        this.failuresByIpAndAccount.reset(keys.ipAccount);
        return this.authService.login(user);
    }
}
