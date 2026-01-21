import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.client.findMany({
            where: { tenantId },
        });
    }

    async create(tenantId: string, data: any) {
        const { name, email, phone } = data;
        return this.prisma.client.create({
            data: {
                name,
                email,
                phone,
                tenantId,
            },
        });
    }

    async update(tenantId: string, id: string, data: any) {
        const { name, email, phone } = data;
        return this.prisma.client.update({
            where: { id, tenantId },
            data: {
                name,
                email,
                phone,
            },
        });
    }

    async delete(tenantId: string, id: string) {
        return this.prisma.client.delete({
            where: { id, tenantId },
        });
    }
}
