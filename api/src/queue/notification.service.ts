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

    async notifyTicketCreated(tenantId: string, ticketId: string, phone: string, name: string, code: string, qrToken: string) {
        const atelierName = await this.settingsService.getSetting(tenantId, 'business_name', 'CARED');
        const trackingUrl = `https://luxuryos.pitayacode.io/q/${qrToken}`;
        const message = `👋 ¡Hola ${name}!

Tu turno en *${atelierName}* es: *${code}*

🌐 Puedes seguir el avance de tu turno en tiempo real aquí:
${trackingUrl}

Te notificaremos cuando sea tu momento de pasar. ✨`;

        return this.sendCustomMessage(tenantId, phone, message);
    }

    async notifyNearTurn(tenantId: string, ticketId: string, phone: string, name: string) {
        const atelierName = await this.settingsService.getSetting(tenantId, 'business_name', 'CARED');
        const message = `👋 ¡Hola ${name}!

Tu turno en *${atelierName}* está muy cerca de ser llamado. Por favor acércate al mostrador. ✨`;

        return this.sendCustomMessage(tenantId, phone, message);
    }

    async notifyNowTurn(tenantId: string, ticketId: string, phone: string, name: string, code: string) {
        const atelierName = await this.settingsService.getSetting(tenantId, 'business_name', 'CARED');
        const message = `🔔 ¡Es tu turno, ${name}!

Turno: *${code}*

Por favor pasa al módulo de atención en *${atelierName}*. ✨`;

        return this.sendCustomMessage(tenantId, phone, message);
    }

    async sendCustomMessage(tenantId: string, recipient: string, content: string): Promise<{ success: boolean; url?: string }> {
        recipient = this.formatPhoneNumber(recipient);
        if (!recipient) return { success: false };

        // Dynamic Provider Check — default to PITAYACORE
        const providerType = await this.settingsService.getSetting(tenantId, 'whatsapp_provider', 'PITAYACORE');

        if (providerType === 'LINKS') {
            const encodedText = encodeURIComponent(content);
            const whatsappUrl = `https://wa.me/${recipient}?text=${encodedText}`;
            console.log(`[WhatsApp Links Provider] Generated WA Link for ${recipient}: ${whatsappUrl}`);

            const dedupeKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await this.prisma.notificationLog.create({
                data: {
                    tenantId,
                    ticketId: null as any,
                    channel: 'WHATSAPP',
                    templateKey: 'CUSTOM_TEXT',
                    messageContent: content,
                    to: recipient,
                    dedupeKey,
                    providerMessageId: 'WA_LINK',
                    status: 'SENT',
                }
            }).catch(err => console.error("Failed to log notification", err));

            return { success: true, url: whatsappUrl };
        }

        let provider: IWhatsAppProvider | null = null;

        if (providerType === 'PITAYACORE') {
            const pitayaUrl = await this.settingsService.getSetting(tenantId, 'pitayacore_api_url', 'https://pitayacore-api.pitayacode.io/api');
            const pitayaKey = await this.settingsService.getSetting(tenantId, 'pitayacore_api_key', 'pitaya_internal_secret_2026');
            const pitayaTenant = await this.settingsService.getSetting(tenantId, 'pitayacore_tenant_id', '87e0dd95-fd29-4e63-a219-18478c58e4c8');

            provider = new PitayaCoreWhatsAppProvider(pitayaUrl, pitayaKey, pitayaTenant);
        } else if (providerType === 'FLOW') {
            const flowUrl = await this.settingsService.getSetting(tenantId, 'flow_api_url', 'https://flow-api.pitayacode.io');
            const flowKey = await this.settingsService.getSetting(tenantId, 'flow_internal_key', 'pitaya_internal_secret_2026');

            provider = new FlowWhatsAppProvider(flowUrl, flowKey);
        }

        if (!provider) {
            provider = new FlowWhatsAppProvider('https://flow-api.pitayacode.io', 'pitaya_internal_secret_2026');
        }

        let messageId: string | null = null;
        try {
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
        } catch (err) {
            console.error('[WhatsApp Send Error]', err);
        }

        // Fallback to Flow provider if primary returned null
        if (!messageId && providerType !== 'FLOW') {
            console.log('[WhatsApp Fallback] Primary provider returned null, sending via Flow provider...');
            try {
                const flowProvider = new FlowWhatsAppProvider('https://flow-api.pitayacode.io', 'pitaya_internal_secret_2026');
                messageId = await flowProvider.sendMessage({
                    recipient,
                    template: 'free_text',
                    components: [{ type: 'body', parameters: [{ type: 'text', text: content }] }]
                });
            } catch (err) {
                console.error('[WhatsApp Fallback Error]', err);
            }
        }

        // Always log message to NotificationLog table for chat history
        const dedupeKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await this.prisma.notificationLog.create({
            data: {
                tenantId,
                ticketId: null as any,
                channel: 'WHATSAPP',
                templateKey: 'CUSTOM_TEXT',
                messageContent: content,
                to: recipient,
                dedupeKey,
                providerMessageId: (messageId || 'SENT').substring(0, 180),
                status: messageId ? 'SENT' : 'LOGGED',
            }
        }).catch(err => console.error("Failed to log notification", err));

        return { success: !!messageId };
    }
}
