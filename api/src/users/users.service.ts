import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
    }

    async findOne(tenantId: string, id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id, tenantId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    async create(tenantId: string, data: any, currentUser?: any) {
        const { email, name, password, role } = data;

        if (role === Role.SYSTEM_ADMIN && currentUser?.role !== Role.SYSTEM_ADMIN) {
            throw new ForbiddenException('Solo un Administrador del Sistema puede crear usuarios SYSTEM_ADMIN');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                role: role || Role.TENANT_USER,
                tenantId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
    }

    async update(tenantId: string, id: string, data: any, currentUser?: any) {
        const target = await this.prisma.user.findUnique({ where: { id, tenantId } });
        if (!target) throw new NotFoundException('Usuario no encontrado');

        if (target.role === Role.SYSTEM_ADMIN && currentUser?.role !== Role.SYSTEM_ADMIN) {
            throw new ForbiddenException('No tienes permisos para modificar a un Administrador del Sistema');
        }

        const { email, name, role, password } = data;

        if (role && role === Role.SYSTEM_ADMIN && currentUser?.role !== Role.SYSTEM_ADMIN) {
            throw new ForbiddenException('Solo un Administrador del Sistema puede asignar el rol SYSTEM_ADMIN');
        }

        const updateData: any = { email, name };
        if (role) {
            updateData.role = role;
        }

        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        return this.prisma.user.update({
            where: { id, tenantId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
    }

    async delete(tenantId: string, id: string, currentUser?: any) {
        if (currentUser?.id === id) {
            throw new BadRequestException('No puedes eliminar tu propia cuenta');
        }

        const target = await this.prisma.user.findUnique({ where: { id, tenantId } });
        if (!target) throw new NotFoundException('Usuario no encontrado');

        if (target.role === Role.SYSTEM_ADMIN && currentUser?.role !== Role.SYSTEM_ADMIN) {
            throw new ForbiddenException('No tienes permisos para eliminar a un Administrador del Sistema');
        }

        return this.prisma.user.delete({
            where: { id, tenantId },
        });
    }
}
