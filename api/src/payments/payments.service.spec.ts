import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma: any = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should throw BadRequestException if amount <= 0', async () => {
      await expect(
        service.recordPayment('ord-1', 0, 'Efectivo'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record payment and update order paidAmount and balance', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord-1',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(200),
        balance: new Prisma.Decimal(800),
      });

      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal(300),
        method: 'Tarjeta',
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        paidAmount: new Prisma.Decimal(500),
        balance: new Prisma.Decimal(500),
        paymentStatus: 'PARCIAL',
      });

      const res = await service.recordPayment(
        'ord-1',
        300,
        'Tarjeta',
        'REF-123',
        'user-ventas',
        'tenant-1',
      );

      expect(res.payment).toBeDefined();
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: 'PARCIAL',
          }),
        }),
      );
    });
  });

  describe('updatePayment', () => {
    it('should throw BadRequestException if amount is <= 0', async () => {
      await expect(
        service.updatePayment('pay-1', { amount: -50 }, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update payment amount and adjust order paidAmount and balance with delta', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal(300),
        method: 'Efectivo',
        reference: null,
        recordedBy: 'user-1',
        order: {
          id: 'ord-1',
          tenantId: 'tenant-1',
          totalAmount: new Prisma.Decimal(1000),
          paidAmount: new Prisma.Decimal(300),
          balance: new Prisma.Decimal(700),
        },
      });

      mockPrisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal(500),
        method: 'Transferencia',
        reference: 'TR-999',
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        paidAmount: new Prisma.Decimal(500),
        balance: new Prisma.Decimal(500),
        paymentStatus: 'PARCIAL',
      });

      const res = await service.updatePayment(
        'pay-1',
        { amount: 500, method: 'Transferencia', reference: 'TR-999' },
        'tenant-1',
        'user-ventas',
      );

      expect(res.payment).toBeDefined();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: new Prisma.Decimal(500),
            method: 'Transferencia',
            reference: 'TR-999',
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidAmount: new Prisma.Decimal(500),
            balance: new Prisma.Decimal(500),
            paymentStatus: 'PARCIAL',
          }),
        }),
      );
    });
  });

  describe('deletePayment', () => {
    it('should delete payment and recalculate order balance', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal(300),
        order: {
          id: 'ord-1',
          tenantId: 'tenant-1',
          totalAmount: new Prisma.Decimal(1000),
          paidAmount: new Prisma.Decimal(300),
          balance: new Prisma.Decimal(700),
        },
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        paidAmount: new Prisma.Decimal(0),
        balance: new Prisma.Decimal(1000),
        paymentStatus: 'PENDIENTE',
      });

      mockPrisma.payment.delete.mockResolvedValue({ id: 'pay-1' });

      await service.deletePayment('pay-1', 'tenant-1');

      expect(mockPrisma.payment.delete).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: 'PENDIENTE',
          }),
        }),
      );
    });
  });
});
