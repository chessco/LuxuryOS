import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IWhatsAppProvider, FlowWhatsAppProvider } from './providers/whatsapp.provider';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationService {
    private whatsappProvider: IWhatsAppProvider | null = null;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private settingsService: SettingsService,
    ) {
        const flowApiUrl = this.configService.get<string>('FLOW_API_URL', 'https://flow-api.pitayacode.io');
        const internalKey = this.configService.get<string>('FLOW_INTERNAL_KEY', 'pitaya_internal_secret_2026');

        if (flowApiUrl && internalKey) {
            this.whatsappProvider = new FlowWhatsAppProvider(flowApiUrl, internalKey);
        }
    }

    async notifyNearTurn(tenantId: string, ticketId: string, phone: string, name: string) {
        const template = this.configService.get<string>('WA_TEMPLATE_NEAR_TURN', 'queue_near_turn');
        const dedupeKey = `ticket:${ticketId}:near`;

        return this.sendWhatsApp(tenantId, ticketId, phone, template, dedupeKey, [
            {
                type: 'body',
                parameters: [{ type: 'text', text: name }],
            },
        ]);
    }

    async notifyNowTurn(tenantId: string, ticketId: string, phone: string, name: string, code: string) {
        const template = this.configService.get<string>('WA_TEMPLATE_NOW_TURN', 'queue_now_turn');
        const dedupeKey = `ticket:${ticketId}:now`;

        return this.sendWhatsApp(tenantId, ticketId, phone, template, dedupeKey, [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: name },
                    { type: 'text', text: code },
                ],
            },
        ]);
    }

    private async sendWhatsApp(
        tenantId: string,
        ticketId: string,
        recipient: string,
        template: string,
        dedupeKey: string,
        components: any[]
    ) {
        // Dynamic Provider Check
        const flowUrl = await this.settingsService.getSetting(tenantId, 'flow_api_url');
        const flowKey = await this.settingsService.getSetting(tenantId, 'flow_internal_key');

        const provider = (flowUrl && flowKey)
            ? new FlowWhatsAppProvider(flowUrl, flowKey)
            : this.whatsappProvider;

        if (!provider) {
            console.log(`[WhatsApp Mock] Sending ${template} to ${recipient}`, { components, dedupeKey });
            return;
        }

        // Deduplication check
        const existing = await this.prisma.notificationLog.findUnique({
            where: { dedupeKey }
        });
        if (existing && existing.status === 'SENT') return;

        const messageId = await provider.sendMessage({
            recipient,
            template,
            components,
        });

        await this.prisma.notificationLog.upsert({
            where: { dedupeKey },
            create: {
                tenantId,
                ticketId,
                channel: 'WHATSAPP',
                templateKey: template,
                to: recipient,
                dedupeKey,
                providerMessageId: messageId,
                status: messageId ? 'SENT' : 'FAILED',
            },
            update: {
                status: messageId ? 'SENT' : 'FAILED',
                providerMessageId: messageId,
            },
        });
    }
}
