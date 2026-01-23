import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async getConversations(userId: string, tenantId: string) {
        return this.prisma.conversation.findMany({
            where: {
                tenantId,
                users: { some: { id: userId } },
            },
            include: {
                users: {
                    select: { id: true, name: true, email: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async getMessages(conversationId: string) {
        return this.prisma.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async saveMessage(conversationId: string, senderId: string, content: string) {
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId,
                content,
            },
            include: {
                sender: {
                    select: { id: true, name: true },
                },
            },
        });

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return message;
    }

    async findOrCreateConversation(user1Id: string, user2Id: string, tenantId: string) {
        // Try to find existing 1:1 conversation
        const existing = await this.prisma.conversation.findFirst({
            where: {
                tenantId,
                AND: [
                    { users: { some: { id: user1Id } } },
                    { users: { some: { id: user2Id } } },
                ],
            },
            include: {
                users: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (existing) return existing;

        // Create new conversation
        return this.prisma.conversation.create({
            data: {
                tenantId,
                users: {
                    connect: [{ id: user1Id }, { id: user2Id }],
                },
            },
            include: {
                users: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }
}
