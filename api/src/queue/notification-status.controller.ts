import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationStatusController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('whatsapp-status')
  getWhatsAppStatus(@Req() req) {
    return this.notificationService.getWhatsAppHealth(req.user.tenantId);
  }
}
