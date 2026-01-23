import { Injectable, NotFoundException } from '@nestjs/common';
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

    async create(tenantId: string, data: any) {
        const { email, name, password, role } = data;
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

    async update(tenantId: string, id: string, data: any) {
        const { email, name, role, password } = data;
        const updateData: any = { email, name, role };

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

    async delete(tenantId: string, id: string) {
        return this.prisma.user.delete({
            where: { id, tenantId },
        });
    }
}
