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
        // Basic logging of callbacks
        console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));
        return { status: 'ok' };
    }
}
