import { Controller, Get, Post, Body, UseGuards, Request, Patch, Delete, Param } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

interface AuthenticatedRequest {
    user: {
        id: string;
        tenantId: string;
        role: Role;
        email?: string;
    };
}

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
    constructor(private clientsService: ClientsService) { }

    @Get()
    async getClients(@Request() req: AuthenticatedRequest) {
        return this.clientsService.findAll(req.user.tenantId, req.user);
    }

    @Post()
    async createClient(@Body() body: CreateClientDto, @Request() req: AuthenticatedRequest) {
        return this.clientsService.create(req.user.tenantId, body, req.user);
    }

    @Patch(':id')
    async updateClient(@Param('id') id: string, @Body() body: UpdateClientDto, @Request() req: AuthenticatedRequest) {
        return this.clientsService.update(req.user.tenantId, id, body, req.user);
    }

    @Get(':id/history')
    async getClientHistory(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.clientsService.getHistory(req.user.tenantId, id);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
    async deleteClient(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.clientsService.delete(req.user.tenantId, id);
    }
}

