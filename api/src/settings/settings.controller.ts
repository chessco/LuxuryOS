import { Controller, Get, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { isAdminRole } from '../common/roles.util';
import { redactSecretSettings, validateSettingsPayload } from './settings.policy';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any) {
    const settings = await this.settingsService.getSettings(req.user.tenantId);
    return isAdminRole(req.user.role) ? settings : redactSecretSettings(settings);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TENANT_ADMIN)
  async updateSettings(@Req() req: any, @Body() body: Record<string, string>) {
    const tenantId = req.user.tenantId;
    const settings = validateSettingsPayload(body);
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        this.settingsService.upsertSetting(tenantId, key, value),
      ),
    );
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
