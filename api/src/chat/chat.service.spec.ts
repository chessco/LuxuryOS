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
});
