import { Injectable, BadRequestException } from '@nestjs/common';
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
        const { name, email, phone, location } = data;
        if (!name || !name.trim()) {
            throw new BadRequestException('El nombre del cliente es obligatorio');
        }
        return this.prisma.client.create({
            data: {
                name: name.toUpperCase().trim(),
                email,
                phone,
                location,
                tenantId,
            },
        });
    }

    async update(tenantId: string, id: string, data: any) {
        const { name, email, phone, location } = data;
        if (name !== undefined && (!name || !name.trim())) {
            throw new BadRequestException('El nombre del cliente es obligatorio');
        }
        return this.prisma.client.update({
            where: { id, tenantId },
            data: {
                name: name ? name.toUpperCase().trim() : undefined,
                email,
                phone,
                location,
            },
        });
    }

    async delete(tenantId: string, id: string) {
        return this.prisma.client.delete({
            where: { id, tenantId },
        });
    }
}
