import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IWhatsAppProvider, FlowWhatsAppProvider, PitayaCoreWhatsAppProvider } from './providers/whatsapp.provider';
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

    private formatPhoneNumber(phone: string): string {
        if (!phone) return phone;
        // Limpiamos cualquier espacio o guión
        const cleaned = phone.replace(/\D/g, '');
        // Si tiene exactamente 10 dígitos, asumimos que es de México y agregamos el 52
        if (cleaned.length === 10) {
            return `52${cleaned}`;
        }
        return cleaned;
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
        recipient = this.formatPhoneNumber(recipient);
        
        // Dynamic Provider Check
        const providerType = await this.settingsService.getSetting(tenantId, 'whatsapp_provider', 'FLOW');

        let provider: IWhatsAppProvider | null = null;

        if (providerType === 'LINKS') {
            // Links provider: sending is handled entirely client-side via wa.me links
            console.log(`[WhatsApp Links] Backend skipped — frontend handles sending via wa.me for tenant ${tenantId}`);
            return;
        } else if (providerType === 'PITAYACORE') {
            const pitayaUrl = await this.settingsService.getSetting(tenantId, 'pitayacore_api_url', 'https://pitayacore-api.pitayacode.io/api');
            const pitayaKey = await this.settingsService.getSetting(tenantId, 'pitayacore_api_key', 'pitaya_internal_secret_2026');
            const pitayaTenant = await this.settingsService.getSetting(tenantId, 'pitayacore_tenant_id', '87e0dd95-fd29-4e63-a219-18478c58e4c8');

            provider = new PitayaCoreWhatsAppProvider(pitayaUrl, pitayaKey, pitayaTenant);
        } else {
            const flowUrl = await this.settingsService.getSetting(tenantId, 'flow_api_url');
            const flowKey = await this.settingsService.getSetting(tenantId, 'flow_internal_key');

            if (flowUrl && flowKey) {
                provider = new FlowWhatsAppProvider(flowUrl, flowKey);
            }
        }

        if (!provider) {
            provider = this.whatsappProvider;
        }

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

    async sendCustomMessage(tenantId: string, recipient: string, content: string): Promise<boolean> {
        recipient = this.formatPhoneNumber(recipient);

        // Dynamic Provider Check — default to PITAYACORE
        const providerType = await this.settingsService.getSetting(tenantId, 'whatsapp_provider', 'PITAYACORE');

        let provider: IWhatsAppProvider | null = null;

        if (providerType === 'LINKS') {
            console.log(`[WhatsApp Links] Backend skipped — frontend handles sending via wa.me for tenant ${tenantId}`);
            return true;
        } else if (providerType === 'PITAYACORE' || !providerType) {
            const pitayaUrl = await this.settingsService.getSetting(tenantId, 'pitayacore_api_url', 'https://pitayacore-api.pitayacode.io/api');
            const pitayaKey = await this.settingsService.getSetting(tenantId, 'pitayacore_api_key', 'pitaya_internal_secret_2026');
            const pitayaTenant = await this.settingsService.getSetting(tenantId, 'pitayacore_tenant_id', '87e0dd95-fd29-4e63-a219-18478c58e4c8');

            provider = new PitayaCoreWhatsAppProvider(pitayaUrl, pitayaKey, pitayaTenant);
        } else {
            const flowUrl = await this.settingsService.getSetting(tenantId, 'flow_api_url');
            const flowKey = await this.settingsService.getSetting(tenantId, 'flow_internal_key');

            if (flowUrl && flowKey) {
                provider = new FlowWhatsAppProvider(flowUrl, flowKey);
            }
        }

        if (!provider) {
            provider = this.whatsappProvider;
        }

        let messageId: string | null = null;
        if (provider) {
            messageId = await provider.sendMessage({
                recipient,
                template: 'free_text',
                components: [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: content }],
                    },
                ],
            });
        }

        // Always log message to NotificationLog table for chat history
        const dedupeKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await this.prisma.notificationLog.create({
            data: {
                tenantId,
                channel: 'WHATSAPP',
                templateKey: 'CUSTOM_TEXT',
                to: recipient,
                dedupeKey,
                providerMessageId: content,
                status: messageId ? 'SENT' : 'LOGGED',
            }
        }).catch(err => console.error("Failed to log notification", err));

        return true;
    }
}
