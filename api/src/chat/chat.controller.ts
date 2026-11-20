import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const SYSTEM_CONVERSATION_DELETER_EMAIL = 'system@pitayacode.io';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('conversations')
    async getConversations(@Req() req) {
        return this.chatService.getConversations(req.user.id, req.user.tenantId);
    }

    @Get('conversations/:id/messages')
    async getMessages(@Param('id') conversationId: string, @Req() req) {
        return this.chatService.getMessages(conversationId, req.user?.id || req.user?.sub, req.user?.tenantId);
    }

    @Post('conversations/find-or-create')
    async findOrCreate(@Req() req, @Body() data: { userId: string }) {
        return this.chatService.findOrCreateConversation(req.user.id, data.userId, req.user.tenantId);
    }

    // --- WhatsApp Endpoints ---

    @Get('whatsapp/conversations')
    async getWhatsAppConversations(@Req() req) {
        return this.chatService.getWhatsAppConversations(req.user.tenantId);
    }

    @Get('whatsapp/messages')
    async getWhatsAppMessages(@Req() req, @Query('phone') phone: string) {
        return this.chatService.getWhatsAppMessages(req.user.tenantId, phone);
    }

    @Post('whatsapp/send')
    async sendWhatsAppMessage(@Req() req, @Body() data: { phone: string; content: string; clientName?: string }) {
        return this.chatService.sendWhatsAppMessage(req.user.tenantId, data.phone, data.content, data.clientName);
    }

    @Delete('whatsapp/conversations')
    async deleteWhatsAppConversation(@Req() req, @Query('phone') phone: string) {
        const email = String(req.user?.email || '').trim().toLowerCase();
        if (email !== SYSTEM_CONVERSATION_DELETER_EMAIL) {
            throw new ForbiddenException('Solo system@pitayacode.io puede eliminar conversaciones');
        }
        return this.chatService.deleteWhatsAppConversation(req.user.tenantId, phone);
    }
}
