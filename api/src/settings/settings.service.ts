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

  async clearDemoData(tenantId: string) {
    // Delete in sequence to avoid foreign key constraint violations
    
    // 1. Delete payments belonging to orders of this tenant
    await this.prisma.payment.deleteMany({
      where: {
        order: { tenantId }
      }
    });

    // 2. Delete queue events of tickets of this tenant
    await this.prisma.queueEvent.deleteMany({
      where: {
        ticket: { tenantId }
      }
    });

    // 3. Delete notification logs of this tenant
    await this.prisma.notificationLog.deleteMany({
      where: { tenantId }
    });

    // 4. Delete queue ticket recommendations of tickets of this tenant
    await this.prisma.queueTicketRecommendation.deleteMany({
      where: {
        ticket: { tenantId }
      }
    });

    // 5. Delete queue tickets of this tenant
    await this.prisma.queueTicket.deleteMany({
      where: { tenantId }
    });

    // 6. Delete orders of this tenant
    await this.prisma.order.deleteMany({
      where: { tenantId }
    });

    // 7. Delete clients of this tenant
    await this.prisma.client.deleteMany({
      where: { tenantId }
    });

    return { success: true };
  }
}
