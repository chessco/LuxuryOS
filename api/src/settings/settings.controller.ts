import { Controller, Get, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @Post()
  async updateSettings(@Req() req: any, @Body() body: Record<string, string>) {
    const tenantId = req.user.tenantId;
    const promises = Object.entries(body).map(([key, value]) =>
      this.settingsService.upsertSetting(tenantId, key, value),
    );
    await Promise.all(promises);
    return { success: true };
  }

  @Post('clear-demo-data')
  async clearDemoData(@Req() req: any) {
    if (req.user.role !== 'SYSTEM_ADMIN') {
      throw new ForbiddenException('Solo el administrador del sistema puede realizar esta acción');
    }
    return this.settingsService.clearDemoData(req.user.tenantId);
  }
}
