import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('conversations')
    async getConversations(@Req() req) {
        return this.chatService.getConversations(req.user.id, req.user.tenantId);
    }

    @Get('conversations/:id/messages')
    async getMessages(@Param('id') conversationId: string) {
        return this.chatService.getMessages(conversationId);
    }

    @Post('conversations/find-or-create')
    async findOrCreate(@Req() req, @Body() data: { userId: string }) {
        return this.chatService.findOrCreateConversation(req.user.id, data.userId, req.user.tenantId);
    }
}
