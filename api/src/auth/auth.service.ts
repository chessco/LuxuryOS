import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.trim().toLowerCase();

    let user: any = null;

    if (normalizedEmail.includes('@')) {
      // Full email provided — exact match
      user = await this.prisma.user.findFirst({
        where: { email: normalizedEmail },
      });
    } else {
      // Nombre de usuario propio (independiente del email): tiene prioridad
      user = await this.prisma.user.findFirst({
        where: { username: normalizedEmail },
      });

      if (!user) {
        // Compatibilidad: usuario sin dominio, solo válido si identifica exactamente una cuenta
        const matches = await this.prisma.user.findMany({
          where: { email: { startsWith: `${normalizedEmail}@` } },
          take: 2,
        });
        user = matches.length === 1 ? matches[0] : null;
      }
    }

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    console.log(
      `[AuthService] Generating token for user: ${user.email}, tenantId: ${user.tenantId}`,
    );
    const payload = {
      email: user.email,
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
      },
    };
  }
}
