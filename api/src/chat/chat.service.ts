import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../queue/notification.service';

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService
    ) { }

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

    // --- WhatsApp Customer Chat Methods ---

    async getWhatsAppConversations(tenantId: string) {
        const logs = await this.prisma.notificationLog.findMany({
            where: {
                tenantId,
                channel: 'WHATSAPP'
            },
            orderBy: { createdAt: 'desc' },
            include: {
                ticket: true
            }
        });

        const clients = await this.prisma.client.findMany({
            where: { tenantId }
        });

        const convMap = new Map<string, any>();

        for (const log of logs) {
            const rawPhone = log.to || log.ticket?.customerPhone || '';
            if (!rawPhone) continue;

            const cleanDigits = rawPhone.replace(/\D/g, '');
            const key = cleanDigits.length === 10 ? `52${cleanDigits}` : cleanDigits;

            if (!convMap.has(key)) {
                const matchedClient = clients.find(c => {
                    const cDigits = (c.phone || '').replace(/\D/g, '');
                    return cDigits && key.endsWith(cDigits);
                });

                const clientName = matchedClient?.name || log.ticket?.customerName || `Cliente (${rawPhone})`;
                const formattedPhone = key.length === 12 && key.startsWith('52')
                    ? `+52 ${key.substring(2, 5)} ${key.substring(5, 8)} ${key.substring(8)}`
                    : `+${key}`;

                convMap.set(key, {
                    id: key,
                    cleanPhone: key,
                    formattedPhone: formattedPhone,
                    clientName: clientName.toUpperCase(),
                    lastMessage: log.dedupeKey?.startsWith('ticket:')
                        ? `Aviso de turno (${log.templateKey})`
                        : (log.templateKey || 'Mensaje de WhatsApp'),
                    updatedAt: log.createdAt,
                    unread: 0
                });
            }
        }

        for (const c of clients) {
            if (!c.phone) continue;
            const cDigits = c.phone.replace(/\D/g, '');
            const key = cDigits.length === 10 ? `52${cDigits}` : cDigits;

            if (!convMap.has(key)) {
                const formattedPhone = key.length === 12 && key.startsWith('52')
                    ? `+52 ${key.substring(2, 5)} ${key.substring(5, 8)} ${key.substring(8)}`
                    : `+${key}`;

                convMap.set(key, {
                    id: key,
                    cleanPhone: key,
                    formattedPhone: formattedPhone,
                    clientName: c.name.toUpperCase(),
                    lastMessage: 'Sin conversación previa',
                    updatedAt: c.createdAt,
                    unread: 0
                });
            }
        }

        return Array.from(convMap.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    async getWhatsAppMessages(tenantId: string, phone: string) {
        const cleanDigits = phone.replace(/\D/g, '');
        const searchKey = cleanDigits.length === 10 ? `52${cleanDigits}` : cleanDigits;

        const logs = await this.prisma.notificationLog.findMany({
            where: {
                tenantId,
                channel: 'WHATSAPP',
            },
            orderBy: { createdAt: 'asc' },
            include: {
                ticket: true
            }
        });

        const filtered = logs.filter(log => {
            const rawPhone = (log.to || log.ticket?.customerPhone || '').replace(/\D/g, '');
            return rawPhone.endsWith(cleanDigits) || searchKey.endsWith(rawPhone);
        });

        return filtered.map(log => ({
            id: log.id,
            content: log.templateKey === 'CUSTOM_TEXT' || !log.templateKey.includes('_')
                ? log.providerMessageId || log.templateKey
                : `Notificación de WhatsApp enviada: ${log.templateKey}`,
            direction: 'OUTBOUND',
            status: log.status,
            createdAt: log.createdAt
        }));
    }

    async sendWhatsAppMessage(tenantId: string, phone: string, content: string, clientName?: string) {
        const success = await this.notificationService.sendCustomMessage(tenantId, phone, content);
        return { success, phone, content, createdAt: new Date() };
    }
}
