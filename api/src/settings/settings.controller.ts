import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
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
}
