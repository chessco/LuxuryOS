import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Normaliza el nombre de usuario (independiente del email). `undefined` = no tocar,
   * `null` = quitar el usuario.
   */
  private normalizeUsername(raw: any): string | null | undefined {
    if (raw === undefined) return undefined;
    const value = String(raw ?? '')
      .trim()
      .toLowerCase();
    if (!value) return null;
    if (!/^[a-z0-9._-]{3,30}$/.test(value)) {
      throw new BadRequestException(
        'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo',
      );
    }
    return value;
  }

  private async assertUsernameFree(username: string, excludeId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { username, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Ese nombre de usuario ya está en uso');
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: USER_SELECT,
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, tenantId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(tenantId: string, data: any, currentUser?: any) {
    const { email, name, password, role } = data;

    if (role === Role.SYSTEM_ADMIN && currentUser?.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Solo un Administrador del Sistema puede crear usuarios SYSTEM_ADMIN',
      );
    }

    const username = this.normalizeUsername(data.username);
    if (username) await this.assertUsernameFree(username);

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        username: username ?? undefined,
        // En el alta el nombre se replica del usuario si no se capturó
        name: name || username || undefined,
        passwordHash,
        role: role || Role.TENANT_USER,
        tenantId,
      },
      select: USER_SELECT,
    });
  }

  async update(tenantId: string, id: string, data: any, currentUser?: any) {
    const target = await this.prisma.user.findUnique({
      where: { id, tenantId },
    });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (
      target.role === Role.SYSTEM_ADMIN &&
      currentUser?.role !== Role.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar a un Administrador del Sistema',
      );
    }

    const { email, name, role, password } = data;

    if (
      role &&
      role === Role.SYSTEM_ADMIN &&
      currentUser?.role !== Role.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException(
        'Solo un Administrador del Sistema puede asignar el rol SYSTEM_ADMIN',
      );
    }

    const updateData: any = { email, name };

    const username = this.normalizeUsername(data.username);
    if (username !== undefined) {
      if (username) await this.assertUsernameFree(username, id);
      updateData.username = username;
    }

    if (role) {
      updateData.role = role;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id, tenantId },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async delete(tenantId: string, id: string, currentUser?: any) {
    if (currentUser?.id === id) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const target = await this.prisma.user.findUnique({
      where: { id, tenantId },
    });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (
      target.role === Role.SYSTEM_ADMIN &&
      currentUser?.role !== Role.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar a un Administrador del Sistema',
      );
    }

    return this.prisma.user.delete({
      where: { id, tenantId },
    });
  }
}
