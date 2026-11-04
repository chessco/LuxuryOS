import { Controller, Post, Get, Body, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

interface PitayaCoreInboundMessage {
    tenantId: string;
    messageId: string;
    phone: string;
    content: string;
    receivedAt?: string;
}

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private settings: SettingsService,
    ) { }

    @Get()
    verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
        const verifyToken = this.configService.get('WA_VERIFY_TOKEN');
        if (mode === 'subscribe' && verifyToken && token === verifyToken) {
            return challenge;
        }
        return 'Forbidden';
    }

    @Post()
    handle(@Body() body: any) {
        // Redacted logging of callbacks to avoid exposing sensitive PII in server logs
        const objectType = body?.object || 'unknown';
        const entryCount = Array.isArray(body?.entry) ? body.entry.length : 0;
        console.log(`[WhatsApp Webhook] Event received: object=${objectType}, entries=${entryCount}`);
        return { status: 'ok' };
    }

    /**
     * Internal callback from PitayaCore after WhatsApp Web has persisted an
     * inbound message. This is intentionally separate from Meta's webhook:
     * PitayaCore is the WhatsApp session owner in this installation.
     */
    @Post('incoming')
    async receiveFromPitayaCore(
        @Headers('x-api-key') apiKey: string,
        @Body() body: PitayaCoreInboundMessage,
    ) {
        const pitayaTenantId = String(body?.tenantId || '').trim();
        const messageId = String(body?.messageId || '').trim();
        const phone = String(body?.phone || '').replace(/\D/g, '');
        const content = typeof body?.content === 'string' ? body.content.trim() : '';

        if (!pitayaTenantId || !messageId || !phone || !content) {
            return { status: 'ignored' };
        }

        const tenantSetting = await this.prisma.setting.findFirst({
            where: { key: 'pitayacore_tenant_id', value: pitayaTenantId },
            select: { tenantId: true },
        });
        if (!tenantSetting) {
            throw new UnauthorizedException('Unknown PitayaCore tenant');
        }

        const expectedKey = await this.settings.getSetting(
            tenantSetting.tenantId,
            'pitayacore_api_key',
            this.configService.get<string>('PITAYACORE_API_KEY') ||
                'pitaya_internal_secret_2026',
        );
        if (!expectedKey || apiKey !== expectedKey) {
            throw new UnauthorizedException('Invalid PitayaCore callback key');
        }

        const dedupeKey = `pitayacore:inbound:${messageId}`;
        const existing = await this.prisma.notificationLog.findUnique({
            where: { dedupeKey },
            select: { id: true },
        });
        if (existing) return { status: 'duplicate' };

        await this.prisma.notificationLog.create({
            data: {
                tenantId: tenantSetting.tenantId,
                ticketId: null,
                channel: 'WHATSAPP',
                templateKey: 'INBOUND_REPLY',
                messageContent: content,
                to: phone,
                dedupeKey,
                providerMessageId: messageId.slice(0, 180),
                status: 'RECEIVED',
                createdAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
            },
        });

        console.log(`[WhatsApp Inbound] Stored message ${messageId} for tenant ${tenantSetting.tenantId}`);
        return { status: 'stored' };
    }
}
