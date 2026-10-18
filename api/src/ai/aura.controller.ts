import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuraService } from './aura.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AuraController {
  constructor(private readonly aura: AuraService) {}

  @Post('chat')
  async chat(@Req() req, @Body() body: { message?: string }) {
    const message = (body?.message || '').trim();
    if (!message) throw new BadRequestException('El mensaje es requerido');
    if (message.length > 4000) throw new BadRequestException('El mensaje es demasiado largo');
    return this.aura.chat(req.user.tenantId, req.user.email, message);
  }
}
