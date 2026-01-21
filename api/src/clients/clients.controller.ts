import { Controller, Get, Post, Body, UseGuards, Request, Patch, Delete, Param } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
    constructor(private clientsService: ClientsService) { }

    @Get()
    async getClients(@Request() req) {
        return this.clientsService.findAll(req.user.tenantId);
    }

    @Post()
    async createClient(@Body() body: any, @Request() req) {
        return this.clientsService.create(req.user.tenantId, body);
    }

    @Patch(':id')
    async updateClient(@Param('id') id: string, @Body() body: any, @Request() req) {
        return this.clientsService.update(req.user.tenantId, id, body);
    }

    @Delete(':id')
    async deleteClient(@Param('id') id: string, @Request() req) {
        return this.clientsService.delete(req.user.tenantId, id);
    }
}
