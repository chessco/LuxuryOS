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
        return this.prisma.client.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }
}
