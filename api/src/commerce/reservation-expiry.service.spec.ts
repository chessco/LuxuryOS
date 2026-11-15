import { ReservationExpiryService } from './reservation-expiry.service';
import { CommerceService } from './commerce.service';
import { CommerceSaleStatus, InventoryReservationStatus } from '@prisma/client';

describe('ReservationExpiryService', () => {
  const commerce = {
    releaseExpiredReservationsGlobally: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    commerce.releaseExpiredReservationsGlobally.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs on startup and then every minute', async () => {
    let scheduledRun!: () => void;
    const timer = {} as NodeJS.Timeout;
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(((callback: () => void) => {
        scheduledRun = callback;
        return timer;
      }) as typeof setInterval);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
    const service = new ReservationExpiryService(commerce as any);

    service.onModuleInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(commerce.releaseExpiredReservationsGlobally).toHaveBeenCalledTimes(1);

    scheduledRun();
    await Promise.resolve();
    await Promise.resolve();
    expect(commerce.releaseExpiredReservationsGlobally).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
  });

  it('does not overlap expiry passes', async () => {
    let resolveRun!: () => void;
    commerce.releaseExpiredReservationsGlobally.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRun = resolve;
      }),
    );
    const service = new ReservationExpiryService(commerce as any);

    const first = service.run();
    await service.run();
    expect(commerce.releaseExpiredReservationsGlobally).toHaveBeenCalledTimes(1);

    resolveRun();
    await first;
  });
});

describe('CommerceService global reservation expiry', () => {
  it('runs the existing CAS cleanup once for every tenant with an expired unpaid reservation', async () => {
    const tx = {
      inventoryReservation: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const prisma = {
      inventoryReservation: {
        findMany: jest.fn().mockResolvedValue([{ tenantId: 'tenant-a' }, { tenantId: 'tenant-b' }]),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    } as any;
    const service = new CommerceService(prisma);

    await service.releaseExpiredReservationsGlobally();

    expect(prisma.inventoryReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: InventoryReservationStatus.ACTIVE,
          sale: {
            is: expect.objectContaining({
              status: CommerceSaleStatus.PENDING_PAYMENT,
              paidAmount: 0,
            }),
          },
        }),
        distinct: ['tenantId'],
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.inventoryReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) }),
    );
  });
});
