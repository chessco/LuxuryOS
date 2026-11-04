import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OrderType, PaymentStatus, Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../queue/notification.service';
import { OrderStrategyFactory } from '../orders/strategies/order-strategy.factory';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ConvertQuoteDto } from './dto/convert-quote.dto';

const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'https://luxuryos.pitayacode.io';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService, private notifications: NotificationService, private strategies: OrderStrategyFactory) {}
  private readonly include = { client: true, convertedOrder: { select: { id: true, specifications: true } } } as const;

  async create(tenantId: string, createdById: string | undefined, dto: CreateQuoteDto) {
    if (!(await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId } }))) throw new NotFoundException('Cliente no encontrado');
    for (let attempt = 0; attempt < 3; attempt++) {
      const quoteNumber = (await this.prisma.quote.count({ where: { tenantId } })) + 1 + attempt;
      try {
        return await this.prisma.quote.create({ data: {
          tenantId, createdById, clientId: dto.clientId, quoteNumber, quoteCode: `COT-${quoteNumber}`,
          pieceType: dto.pieceType, notes: dto.notes, laborCost: dto.laborCost || 0,
          materialCost: dto.materialCost || 0, totalAmount: dto.totalAmount,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          specifications: dto.specifications as Prisma.InputJsonValue | undefined,
          publicToken: randomBytes(32).toString('base64url'),
        }, include: this.include });
      } catch (error: any) { if (error?.code !== 'P2002' || attempt === 2) throw error; }
    }
  }

  list(tenantId: string, status?: QuoteStatus) {
    return this.prisma.quote.findMany({ where: { tenantId, ...(status ? { status } : {}) }, include: this.include, orderBy: { createdAt: 'desc' } });
  }
  async get(tenantId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, tenantId }, include: this.include });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }
  async update(tenantId: string, id: string, dto: Partial<CreateQuoteDto>) {
    const quote = await this.get(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT) throw new ConflictException('La cotización ya no se puede editar');
    return this.prisma.quote.update({ where: { id }, data: { ...dto, validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined, specifications: dto.specifications as Prisma.InputJsonValue | undefined }, include: this.include });
  }
  async sendWhatsApp(tenantId: string, id: string) {
    const quote = await this.get(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT) throw new ConflictException('Esta cotización no se puede enviar');
    if (!quote.client.phone) throw new BadRequestException('El cliente no tiene teléfono');
    const link = `${PUBLIC_WEB_URL}/quote/${quote.publicToken}`;
    const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(quote.totalAmount));
    const content = `Hola, ${quote.client.name}.\n\nCARED preparó la cotización *${quote.quoteCode}*.\n\nDetalle: ${quote.pieceType}\nTotal: ${money}\n\nConsulta, autoriza o descarga tu cotización:\n${link}`;
    const result = await this.notifications.sendCustomMessage(tenantId, quote.client.phone, content);
    if (!result.success) throw new BadRequestException('No fue posible preparar el envío por WhatsApp');
    await this.prisma.quote.update({ where: { id }, data: { status: QuoteStatus.SENT, sentAt: new Date() } });
    return { ...result, link };
  }
  async cancel(tenantId: string, id: string) {
    const quote = await this.get(tenantId, id);
    if (quote.status === QuoteStatus.CONVERTED || quote.status === QuoteStatus.CANCELLED) throw new ConflictException('La cotización está cerrada');
    return this.prisma.quote.update({ where: { id }, data: { status: QuoteStatus.CANCELLED, cancelledAt: new Date() }, include: this.include });
  }
  async publicGet(token: string) {
    const q = await this.prisma.quote.findUnique({ where: { publicToken: token }, include: { client: { select: { name: true } } } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    // This endpoint is bearer-token public: never return staff notes, costs, or raw specifications.
    return { quoteCode: q.quoteCode, status: q.status, clientName: q.client.name, pieceType: q.pieceType, totalAmount: q.totalAmount, validUntil: q.validUntil, createdAt: q.createdAt, authorizedAt: q.authorizedAt };
  }
  async authorize(token: string) {
    const q = await this.prisma.quote.findUnique({ where: { publicToken: token } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.status === QuoteStatus.AUTHORIZED) return this.publicGet(token);
    if (q.status !== QuoteStatus.SENT) throw new ConflictException('La cotización no está disponible para autorización');
    const changed = await this.prisma.quote.updateMany({ where: { id: q.id, status: QuoteStatus.SENT }, data: { status: QuoteStatus.AUTHORIZED, authorizedAt: new Date() } });
    if (!changed.count) throw new ConflictException('La cotización cambió de estado');
    return this.publicGet(token);
  }
  async convert(tenantId: string, id: string, dto: ConvertQuoteDto, userId?: string) {
    if (dto.targetType === OrderType.QUOTE) throw new BadRequestException('Una cotización no puede convertirse en otra cotización');
    const quote = await this.get(tenantId, id);
    if (quote.status !== QuoteStatus.AUTHORIZED) throw new ConflictException('La cotización debe estar autorizada');
    if (quote.convertedOrder) throw new ConflictException('La cotización ya fue convertida');
    const technicalTypes: OrderType[] = [OrderType.REPAIR, OrderType.MANUFACTURE, OrderType.DESIGN, OrderType.LASER];
    const quoteSpecifications = (quote.specifications || {}) as Record<string, any>;
    const firstItem = Array.isArray(quoteSpecifications.items)
      ? quoteSpecifications.items[0] || {}
      : {};
    // Los campos que se capturan al cotizar son la base de la orden. En la
    // conversión solo se complementan los datos operativos que hagan falta.
    const source = { ...quoteSpecifications, ...firstItem, ...(dto.operationalFields || {}) };
    if (technicalTypes.includes(dto.targetType)) {
      if (!String(source.size || '').trim() || !String(source.thickness || '').trim()) {
        throw new BadRequestException('La medida y el grosor son obligatorios para convertir a trabajo técnico');
      }
    }
    const strategy = this.strategies.getStrategy(dto.targetType);
    const prefix: Record<string, string> = { STANDARD: 'PED', REPAIR: 'REP', MANUFACTURE: 'FAB', DESIGN: 'DIS', LASER: 'LAS', LAYAWAY: 'APT' };
    const order = await this.prisma.$transaction(async tx => {
      // Move to the terminal state as the conditional lock. The enclosing transaction rolls it back if order creation fails.
      const locked = await tx.quote.updateMany({ where: { id, tenantId, status: QuoteStatus.AUTHORIZED, convertedOrderId: null }, data: { status: QuoteStatus.CONVERTED, convertedAt: new Date() } });
      if (!locked.count) throw new ConflictException('La cotización ya fue convertida');
      const sequence = (await tx.order.count({ where: { tenantId, type: dto.targetType } })) + 1;
      const orderCode = `${prefix[dto.targetType]}-${sequence}`;
      const created = await tx.order.create({ data: {
        tenantId, clientId: quote.clientId, createdById: userId, type: dto.targetType,
        status: strategy.getInitialStatus(), pieceType: quote.pieceType, value: quote.totalAmount,
        cost: quote.materialCost, margin: quote.laborCost, totalAmount: quote.totalAmount,
        balance: quote.totalAmount, laborCost: quote.laborCost, materialCost: quote.materialCost,
        paymentStatus: PaymentStatus.PENDIENTE, notes: quote.notes,
        promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : undefined,
        metal: source.metal || undefined, color: source.color || undefined,
        karats: source.karats || undefined, weight: source.weight || undefined,
        size: source.size || undefined, thickness: source.thickness || undefined,
        itemCode: source.itemCode || undefined, imageUrl: source.imageUrl || undefined,
        specifications: { ...quoteSpecifications, ...(dto.operationalFields || {}), orderCode, sourceQuoteId: quote.id, sourceQuoteCode: quote.quoteCode } as Prisma.InputJsonValue,
      } });
      await tx.quote.update({ where: { id }, data: { status: QuoteStatus.CONVERTED, convertedOrderId: created.id, convertedAt: new Date() } });
      return created;
    });
    return { quoteId: id, quoteStatus: QuoteStatus.CONVERTED, orderId: order.id, orderCode: (order.specifications as any)?.orderCode };
  }
}
