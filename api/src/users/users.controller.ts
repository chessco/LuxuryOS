import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll(@Request() req) {
        return this.usersService.findAll(req.user.tenantId);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.usersService.findOne(req.user.tenantId, id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.SYSTEM_ADMIN, Role.TENANT_ADMIN)
    create(@Request() req, @Body() data: any) {
        return this.usersService.create(req.user.tenantId, data, req.user);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.SYSTEM_ADMIN, Role.TENANT_ADMIN)
    update(@Request() req, @Param('id') id: string, @Body() data: any) {
        return this.usersService.update(req.user.tenantId, id, data, req.user);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.SYSTEM_ADMIN, Role.TENANT_ADMIN)
    remove(@Request() req, @Param('id') id: string) {
        return this.usersService.delete(req.user.tenantId, id, req.user);
    }
}
