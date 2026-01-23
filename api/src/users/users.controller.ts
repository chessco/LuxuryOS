import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
    create(@Request() req, @Body() data: any) {
        return this.usersService.create(req.user.tenantId, data);
    }

    @Put(':id')
    update(@Request() req, @Param('id') id: string, @Body() data: any) {
        return this.usersService.update(req.user.tenantId, id, data);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.usersService.delete(req.user.tenantId, id);
    }
}
