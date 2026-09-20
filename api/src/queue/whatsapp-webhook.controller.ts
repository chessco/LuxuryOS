import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
    constructor(private configService: ConfigService) { }

    @Get()
    verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
        const verifyToken = this.configService.get('WA_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
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
}
