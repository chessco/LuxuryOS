import { NotificationService } from './notification.service';

describe('WhatsApp outbound log status', () => {
  const prisma = { notificationLog: { create: jest.fn() } };
  const settings = { getSetting: jest.fn() };
  const service = new NotificationService(prisma as any, {} as any, settings as any);
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    settings.getSetting.mockImplementation((_, __, fallback) => Promise.resolve(fallback));
    prisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
  });
  afterAll(() => { global.fetch = originalFetch; });

  it('records local gateway acceptance without claiming WhatsApp server delivery', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({ success: true, messageId: 'wamid-1' }),
    }) as any;

    expect(await service.sendCustomMessage('tenant-1', '6441234567', 'Hola')).toEqual({ success: true });
    expect(prisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'ACCEPTED', providerMessageId: 'wamid-1' }),
    }));
  });

  it('records a failed gateway request as not sent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 400,
      text: async () => JSON.stringify({ success: false, error: 'No active channel' }),
    }) as any;

    expect(await service.sendCustomMessage('tenant-1', '6441234567', 'Hola')).toEqual({ success: false });
    expect(prisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'LOGGED' }),
    }));
  });
});
