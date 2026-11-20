import { ForbiddenException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('WhatsApp conversation phone filtering', () => {
  it('does not show a log without a phone in every client conversation', async () => {
    const prisma = {
      notificationLog: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'missing', to: null, ticket: null, messageContent: 'Other client', status: 'LOGGED', templateKey: 'CUSTOM_TEXT' },
          { id: 'matching', to: '526441234567', ticket: null, messageContent: 'Correct client', status: 'SENT', templateKey: 'CUSTOM_TEXT' },
          { id: 'legacy-mx', to: '5216441234567', ticket: null, messageContent: 'Incoming client', status: 'RECEIVED', templateKey: 'INBOUND_REPLY' },
        ]),
      },
    };
    const service = new ChatService(prisma as any, {} as any);

    const messages = await service.getWhatsAppMessages('tenant-1', '6441234567');

    expect(messages.map((message) => message.id)).toEqual(['matching', 'legacy-mx']);
    expect(await service.getWhatsAppMessages('tenant-1', '')).toEqual([]);
  });

  it('deletes only WhatsApp notification logs matching the normalized phone or LID', async () => {
    const prisma = {
      notificationLog: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'log-1', to: '5216441234567', ticket: null },
          { id: 'log-2', to: null, ticket: { customerPhone: '6441234567' } },
          { id: 'log-other', to: '526449999999', ticket: null },
          { id: 'log-lid', to: '203398917278682@lid', ticket: null },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const service = new ChatService(prisma as any, {} as any);

    const result = await service.deleteWhatsAppConversation('tenant-1', '6441234567');

    expect(result).toEqual({ deletedCount: 2 });
    expect(prisma.notificationLog.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        channel: 'WHATSAPP',
        id: { in: ['log-1', 'log-2'] },
      },
    });
  });

  it('allows only system@pitayacode.io to delete WhatsApp conversations', async () => {
    const chatService = {
      deleteWhatsAppConversation: jest.fn().mockResolvedValue({ deletedCount: 3 }),
    };
    const controller = new ChatController(chatService as any);

    await expect(
      controller.deleteWhatsAppConversation(
        { user: { email: 'admin@cared.com', tenantId: 'tenant-1' } },
        '526441234567',
      ),
    ).rejects.toThrow(ForbiddenException);

    const allowed = await controller.deleteWhatsAppConversation(
      { user: { email: 'System@PitayaCode.io', tenantId: 'tenant-1' } },
      '526441234567',
    );
    expect(allowed).toEqual({ deletedCount: 3 });
    expect(chatService.deleteWhatsAppConversation).toHaveBeenCalledWith('tenant-1', '526441234567');
  });
});
