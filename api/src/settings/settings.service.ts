import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { tenantId },
    });
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async upsertSetting(tenantId: string, key: string, value: string) {
    return this.prisma.setting.upsert({
      where: {
        tenantId_key: { tenantId, key },
      },
      update: { value },
      create: { tenantId, key, value },
    });
  }

  async getSetting(tenantId: string, key: string, defaultValue?: string): Promise<string> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
    return setting?.value || defaultValue || '';
  }
}
