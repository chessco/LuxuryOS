import { UnauthorizedException } from '@nestjs/common';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

describe('PitayaCore WhatsApp delivery acknowledgements', () => {
  const prisma = {
    setting: { findFirst: jest.fn() },
    notificationLog: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const settings = { getSetting: jest.fn() };
  const controller = new WhatsAppWebhookController(
    { get: jest.fn() } as any,
    prisma as any,
    settings as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.setting.findFirst.mockResolvedValue({ tenantId: 'luxury-tenant' });
    settings.getSetting.mockResolvedValue('shared-key');
    prisma.notificationLog.findFirst.mockResolvedValue({ id: 'log-1', status: 'ACCEPTED' });
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
  });

  it('marks a phone delivery only after ACK_DEVICE', async () => {
    const result = await controller.receiveAckFromPitayaCore('shared-key', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: 2,
    });

    expect(result).toEqual({ status: 'DELIVERED' });
    expect(prisma.notificationLog.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'luxury-tenant', channel: 'WHATSAPP', providerMessageId: 'wamid-1' },
      select: { id: true, status: true },
    });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith({
      where: { id: 'log-1', status: { notIn: ['DELIVERED', 'FAILED'] } },
      data: { status: 'DELIVERED' },
    });
  });

  it('keeps a single check for ACK_SERVER', async () => {
    expect(await controller.receiveAckFromPitayaCore('shared-key', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: 1,
    })).toEqual({ status: 'SENT' });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'SENT' },
    }));
  });

  it('records a communication error', async () => {
    expect(await controller.receiveAckFromPitayaCore('shared-key', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: -1,
    })).toEqual({ status: 'FAILED' });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'FAILED' },
    }));
  });

  it('requests a retry when the acknowledgement arrives before the send log', async () => {
    prisma.notificationLog.findFirst.mockResolvedValue(null);
    expect(await controller.receiveAckFromPitayaCore('shared-key', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: 2,
    })).toEqual({ status: 'pending' });
  });

  it('rejects a callback with the wrong key', async () => {
    await expect(controller.receiveAckFromPitayaCore('wrong', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: 2,
    })).rejects.toThrow(UnauthorizedException);
    expect(prisma.notificationLog.findFirst).not.toHaveBeenCalled();
  });

  it('ignores a pending ACK instead of marking the message as sent', async () => {
    expect(await controller.receiveAckFromPitayaCore('shared-key', {
      tenantId: 'pitaya-tenant', messageId: 'wamid-1', ack: 0,
    })).toEqual({ status: 'ignored' });
    expect(prisma.notificationLog.updateMany).not.toHaveBeenCalled();
  });
});
