import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStage, OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { generateTrackToken, generateHmacToken } from './tracking.util';
import * as fs from 'fs';
import * as path from 'path';

import { OrderStrategyFactory } from './strategies/order-strategy.factory';
import { NotificationService } from '../queue/notification.service';
import { SettingsService } from '../settings/settings.service';
import {
  isAdminRole,
  isDesignerRole,
  isJoyeroRole,
  isVendedorRole,
} from '../common/roles.util';


const STATUS_ORDER: Record<string, number> = {
  RECEIVED: 0,
  RECIBIDO: 0,
  DRAFT: 0,
  SPEC_PENDING: 0,
  INTERES_LEAD: 0,
  COTIZACION_ENVIADA: 0,
  QUOTE_SENT: 0,
  APPROVED: 0,
  APROBADO_ANTICIPO: 0,
  DIAGNOSIS_PENDING: 1,
  WAITING_PARTS: 1,
  IN_REPAIR: 1,
  IN_PRODUCTION: 1,
  EN_PRODUCCION: 1,
  QUALITY_CHECK: 1,
  CONTROL_CALIDAD: 1,
  MATERIALS_PENDING: 1,
  RETURNED: 0.5,
  DEVUELTO: 0.5,
  REPAIR_COMPLETED: 2,
  READY_FOR_PICKUP: 2,
  READY: 2,
  LISTO_ENTREGA: 2,
  DELIVERED: 3,
  ENTREGADO: 3,
  ENTREGADO_POSTVENTA: 3,
  CANCELLED: 4,
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private strategyFactory: OrderStrategyFactory,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
  ) {}

  async getBoard(tenantId: string, type?: string) {
    const query: any = { tenantId };
    if (type) {
      query.type = type;
    } else {
      query.type = 'STANDARD';
    }

    const orders = await this.prisma.order.findMany({
      where: query,
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Determine grouping keys based on type
    let groupingEnum: any;
    let groupingField: 'stage' | 'status';

    if (
      type === 'REPAIR' ||
      type === 'MANUFACTURE' ||
      type === 'DESIGN' ||
      type === 'LASER' ||
      type === 'LAYAWAY'
    ) {
      groupingEnum = OrderStatus;
      groupingField = 'status';
    } else {
      groupingEnum = OrderStage;
      groupingField = 'stage';
    }

    const columns = Object.values(groupingEnum).reduce((acc: any, key: any) => {
      acc[key] = orders
        .filter((o: any) => o[groupingField] === key)
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      return acc;
    }, {});

    return columns;
  }

  async moveOrder(
    id: string,
    tenantId: string,
    toStage: any,
    user?: any,
    options?: { viaQrDelivery?: boolean },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.tenantId !== tenantId)
      throw new ForbiddenException('No tienes permiso para mover este pedido');

    const usesStatus =
      order.type === 'REPAIR' ||
      order.type === 'MANUFACTURE' ||
      (order.type as string) === 'DESIGN' ||
      (order.type as string) === 'LASER' ||
      order.type === 'LAYAWAY';
    const validTargets: string[] = usesStatus
      ? Object.values(OrderStatus)
      : Object.values(OrderStage);

    const toStageUpper = String(toStage || '').toUpperCase();
    const isReturnAction =
      toStageUpper === 'RETURNED' || toStageUpper === 'DEVUELTO';

    if (
      typeof toStage !== 'string' ||
      (!validTargets.includes(toStage) && !isReturnAction)
    ) {
      throw new BadRequestException('Estado destino inválido');
    }

    // Si se devuelve, la orden pasa a RETURNED (o RECIBIDO si el tipo no usa OrderStatus)
    const effectiveTarget = isReturnAction
      ? usesStatus
        ? 'RETURNED'
        : 'RECIBIDO'
      : toStage;

    const isDeliveredTarget =
      effectiveTarget.toUpperCase() === 'DELIVERED' ||
      effectiveTarget.toUpperCase() === 'ENTREGADO' ||
      effectiveTarget.toUpperCase() === 'ENTREGADO_POSTVENTA';

    // RF-01: Entrega física exclusiva vía QR (Mostrador/Ventas no pueden marcarla manualmente)
    if (
      isDeliveredTarget &&
      user &&
      !isAdminRole(user.role, user.email) &&
      !options?.viaQrDelivery
    ) {
      throw new ForbiddenException(
        'La entrega física a cliente no se puede realizar manualmente. Debe efectuarse mediante el escaneo del código QR validando saldo y entrega física.',
      );
    }

    // RF-06: Restricción para Diseñador (no puede marcar terminado final ni entregado)
    if (user && isDesignerRole(user.role, user.email, user.name)) {
      const toStageUp = effectiveTarget.toUpperCase();
      const isFinalOrDelivered =
        toStageUp === 'REPAIR_COMPLETED' ||
        toStageUp === 'READY_FOR_PICKUP' ||
        toStageUp === 'LISTO_ENTREGA' ||
        toStageUp === 'TERMINADO' ||
        toStageUp === 'DELIVERED' ||
        toStageUp === 'ENTREGADO' ||
        toStageUp === 'ENTREGADO_POSTVENTA';
      if (isFinalOrDelivered) {
        throw new ForbiddenException(
          'El rol Diseñador no tiene permitido marcar trabajos como terminados o entregados. Su función es completar el diseño y asignar al Joyero.',
        );
      }
    }

    if (user && !isAdminRole(user.role, user.email)) {

      const isReturnAllowed =
        isReturnAction ||
        (effectiveTarget.toUpperCase() === 'RECEIVED' &&
          (user.role === 'JOYERO' ||
            String(user.role || '').toUpperCase() === 'JOYERO' ||
            user.role === 'VENDEDOR' ||
            String(user.role || '').toUpperCase() === 'VENDEDOR' ||
            user.role === 'VENTAS' ||
            String(user.role || '').toUpperCase() === 'VENTAS' ||
            String(user.email || '')
              .toLowerCase()
              .includes('joyero') ||
            String(user.email || '')
              .toLowerCase()
              .includes('vendedor') ||
            String(user.email || '')
              .toLowerCase()
              .includes('ventas') ||
            String(user.name || '')
              .toLowerCase()
              .includes('joyero') ||
            String(user.name || '')
              .toLowerCase()
              .includes('vendedor')));

      if (!isReturnAllowed) {
        const currentIdx =
          STATUS_ORDER[
            String(
              (usesStatus ? order.status : order.stage) || '',
            ).toUpperCase()
          ];
        const targetIdx = STATUS_ORDER[effectiveTarget.toUpperCase()];
        if (
          currentIdx !== undefined &&
          targetIdx !== undefined &&
          targetIdx < currentIdx
        ) {
          throw new ForbiddenException(
            'No está permitido retroceder el estado del flujo de trabajo.',
          );
        }
      }
    }

    const updateData: any = {};
    if (usesStatus) {
      updateData.status = effectiveTarget;
    } else {
      updateData.stage = effectiveTarget;
    }

    const toStageForSpecs = effectiveTarget.toUpperCase();
    const isReadyStage =
      toStageForSpecs === 'REPAIR_COMPLETED' ||
      toStageForSpecs === 'READY_FOR_PICKUP' ||
      toStageForSpecs === 'LISTO_ENTREGA' ||
      toStageForSpecs === 'READY' ||
      toStageForSpecs === 'LISTO' ||
      toStageForSpecs === 'PARA ENTREGA' ||
      toStageForSpecs === 'TERMINADO';

    const specs = (order.specifications as any) || {};
    const userName = user?.name || user?.email || 'Joyero';

    if (isReturnAction) {
      updateData.specifications = {
        ...specs,
        returnedByName: userName,
        returnedBy: {
          id: user?.id,
          name: userName,
          email: user?.email,
          role: user?.role,
          at: new Date(),
        },
        returnReason: 'Devuelto por joyero a recepción',
        isReturned: true,
      };
    } else {
      if (specs.isReturned) {
        const {
          isReturned,
          returnReason,
          returnedBy,
          returnedByName,
          ...restSpecs
        } = specs;
        updateData.specifications = restSpecs;
      }
      if (isReadyStage) {
        updateData.specifications = {
          ...(updateData.specifications || specs),
          readyByName: userName,
          readyBy: {
            id: user?.id,
            name: userName,
            email: user?.email,
            role: user?.role,
            at: new Date(),
          },
        };
      }
    }

    if (
      effectiveTarget === 'DELIVERED' ||
      effectiveTarget === 'ENTREGADO' ||
      effectiveTarget === 'ENTREGADO_POSTVENTA'
    ) {
      updateData.deliveredAt = new Date();
    } else if (order.deliveredAt) {
      updateData.deliveredAt = null;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Trigger automatic WhatsApp notification on status transition asynchronously (non-blocking)
    this.notifyOrderWorkflowStatus(tenantId, id).catch((err) => {
      console.error('[Workflow WhatsApp Notification Error]', err);
    });

    return updated;
  }

  private async assertClientInTenant(
    tenantId: string,
    clientId?: string | null,
  ) {
    if (!clientId) return;
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) throw new BadRequestException('El cliente indicado no existe');
  }

  /**
   * RF-08: suma mano de obra y material de cada pieza (specifications.items[]).
   * `hasCosts` es false en órdenes antiguas, que solo traen un costo a nivel de orden.
   */
  private sumItemCosts(items: any): {
    labor: number;
    material: number;
    hasCosts: boolean;
  } {
    if (!Array.isArray(items)) return { labor: 0, material: 0, hasCosts: false };
    const num = (v: any) => {
      const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const given = (v: any) => v !== undefined && v !== null && v !== '';
    let hasCosts = false;
    let labor = 0;
    let material = 0;
    for (const it of items) {
      if (given(it?.laborCost) || given(it?.materialCost)) hasCosts = true;
      labor += num(it?.laborCost);
      material += num(it?.materialCost);
    }
    return { labor, material, hasCosts };
  }

  async savePhotoFile(
    tenantId: string,
    fileOrBase64: { buffer?: Buffer; originalname?: string; mimetype?: string } | string,
  ): Promise<string> {
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const tenantUploadsDir = path.join(uploadsDir, tenantId);
    if (!fs.existsSync(tenantUploadsDir)) {
      fs.mkdirSync(tenantUploadsDir, { recursive: true });
    }

    if (typeof fileOrBase64 === 'string') {
      const match = fileOrBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const data = match[2];
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const filename = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(tenantUploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        return `/uploads/${tenantId}/${filename}`;
      }
      return fileOrBase64;
    } else if (fileOrBase64 && (fileOrBase64 as any).buffer) {
      const ext = path.extname((fileOrBase64 as any).originalname || '.jpg') || '.jpg';
      const filename = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(tenantUploadsDir, filename);
      fs.writeFileSync(filePath, (fileOrBase64 as any).buffer);
      return `/uploads/${tenantId}/${filename}`;
    }
    return '';
  }

  async createOrder(tenantId: string, data: CreateOrderDto, userId?: string) {
    await this.assertClientInTenant(tenantId, data.clientId);
    if (
      !data.promisedAt &&
      !data.dueDate &&
      !data.specifications?.promisedDate
    ) {
      throw new BadRequestException(
        'La fecha compromiso de entrega es obligatoria para registrar la orden.',
      );
    }

    const type = data.type || 'STANDARD';
    const isWorkshopJob =
      type === 'REPAIR' ||
      type === 'MANUFACTURE' ||
      type === 'DESIGN' ||
      type === 'LASER';

    // RF-01: Medida y grosor obligatorios en trabajos técnicos
    if (isWorkshopJob) {
      const sizeVal = data.size || data.specifications?.items?.[0]?.size;
      if (!sizeVal || !String(sizeVal).trim()) {
        throw new BadRequestException('La medida es obligatoria.');
      }
      const thicknessVal = data.thickness || data.specifications?.items?.[0]?.thickness;
      if (!thicknessVal || !String(thicknessVal).trim()) {
        throw new BadRequestException('El grosor es obligatorio.');
      }

      if (Array.isArray(data.specifications?.items)) {
        for (let i = 0; i < data.specifications.items.length; i++) {
          const it = data.specifications.items[i];
          if (!it.size || !String(it.size).trim()) {
            throw new BadRequestException('La medida es obligatoria.');
          }
          if (!it.thickness || !String(it.thickness).trim()) {
            throw new BadRequestException('El grosor es obligatorio.');
          }
        }
      }
    }

    // RF-08: con costos por pieza, el total es la suma de mano de obra + material de todas las piezas
    const itemCosts = this.sumItemCosts(data.specifications?.items);
    const totalAmount = itemCosts.hasCosts
      ? itemCosts.labor + itemCosts.material
      : (data.totalAmount ?? data.value ?? 0);
    const paidAmount = 0;
    const balance = totalAmount;
    // El material es costo: la utilidad del taller es la mano de obra
    const margin = itemCosts.hasCosts
      ? itemCosts.labor
      : (data.value || 0) - (data.cost || 0);
    const itemFinancials = itemCosts.hasCosts
      ? {
          value: itemCosts.labor,
          cost: itemCosts.material,
          laborCost: itemCosts.labor,
          materialCost: itemCosts.material,
        }
      : {};

    // Determine initial status from strategy if not provided
    let status = data.status;
    if (!status && data.type) {
      const strategy = this.strategyFactory.getStrategy(data.type);
      if (strategy) {
        status = strategy.getInitialStatus();
      }
    }

    const count = await this.prisma.order.count({
      where: { tenantId, type },
    });
    const sequence = count + 1;
    const prefix =
      type === 'REPAIR'
        ? 'REP'
        : type === 'MANUFACTURE'
          ? 'FAB'
          : type === 'DESIGN'
            ? 'DIS'
            : type === 'LASER'
              ? 'LAS'
              : type === 'LAYAWAY'
                ? 'APT'
                : 'PED';
    const orderCode = `${prefix}-${sequence}`;

    // RF-02: Persistencia robusta de fotografías
    let photoUrl = data.imageUrl || data.specifications?.items?.[0]?.imageUrl || undefined;
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('data:image/')) {
      try {
        photoUrl = await this.savePhotoFile(tenantId, photoUrl);
      } catch (err) {
        console.error('[OrdersService] Error saving photo to disk, using base64 fallback:', err);
      }
    }

    const existingEnvelopeImages = Array.isArray(data.specifications?.envelopeImages)
      ? [...data.specifications.envelopeImages]
      : [];
    if (photoUrl && !existingEnvelopeImages.includes(photoUrl)) {
      existingEnvelopeImages.unshift(photoUrl);
    }

    const updatedItems = Array.isArray(data.specifications?.items)
      ? data.specifications.items.map((it: any, idx: number) => ({
          ...it,
          imageUrl: idx === 0 && photoUrl ? photoUrl : it.imageUrl || undefined,
        }))
      : undefined;

    const specifications = {
      ...(typeof data.specifications === 'object' ? data.specifications : {}),
      orderCode,
      envelopeImages: existingEnvelopeImages,
      ...(updatedItems ? { items: updatedItems } : {}),
    };

    const created = await this.prisma.order.create({
      data: {
        ...data,
        ...itemFinancials,
        imageUrl: photoUrl || data.imageUrl || undefined,
        size: data.size ? String(data.size).trim() : undefined,
        thickness: data.thickness ? String(data.thickness).trim() : undefined,
        tenantId,
        createdById: data.createdById || userId,
        totalAmount,
        paidAmount,
        balance,
        margin,
        status: status ?? undefined, // Let Prisma default to DRAFT if undefined
        specifications,
      },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        queueTicket: true,
      },
    });

    // Trigger automatic WhatsApp notification on order creation (Recibido con QR)
    try {
      await this.notifyOrderWorkflowStatus(tenantId, created.id);
    } catch (error) {
      console.error('[Create Order WhatsApp Notification Error]', error);
    }

    return created;
  }

  async getOrders(tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        queueTicket: true,
      },
    });

    // Sort in memory to avoid "Out of sort memory" errors in limited MySQL environments
    return orders.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getOrder(tenantId: string, idOrCode: string) {
    let cleanIdOrCode = (idOrCode || '').trim();
    try {
      cleanIdOrCode = decodeURIComponent(cleanIdOrCode).trim();
    } catch {}
    const trackMatch = cleanIdOrCode.match(/\/track\/([a-zA-Z0-9_-]+)/i);
    if (trackMatch) cleanIdOrCode = trackMatch[1];
    const orderUrlMatch = cleanIdOrCode.match(/\/orders\/([a-fA-F0-9-]+)/i);
    if (orderUrlMatch) cleanIdOrCode = orderUrlMatch[1];

    let order = await this.prisma.order.findFirst({
      where: { id: cleanIdOrCode, tenantId },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        payments: true,
        queueTicket: true,
      },
    });

    if (!order) {
      const allOrders = await this.prisma.order.findMany({
        where: { tenantId },
        include: {
          client: true,
          createdBy: { select: { id: true, name: true, email: true } },
          payments: true,
          queueTicket: true,
        },
      });

      const searchCode = cleanIdOrCode.toUpperCase().trim();
      const searchLower = cleanIdOrCode.toLowerCase().trim();
      const searchNormalized = searchCode.replace(/[^A-Z0-9]/g, '');

      order =
        allOrders.find((o) => {
          // 1. Direct specifications orderCode (e.g. REP-38)
          const specCode = String(
            (o.specifications as any)?.orderCode || '',
          ).toUpperCase();
          if (specCode && specCode === searchCode) return true;
          const specClean = specCode.replace(/-0+/, '-');
          const searchClean = searchCode.replace(/-0+/, '-');
          if (specClean && specClean === searchClean) return true;

          // 2. Normalize codes without hyphens (e.g. REP38 vs REP-38)
          if (
            specCode &&
            specCode.replace(/[^A-Z0-9]/g, '') === searchNormalized
          )
            return true;

          // 3. Match tracking token (generated in WhatsApp QR and public track URLs)
          try {
            const trackToken = generateTrackToken(o.id).toLowerCase();
            if (trackToken === searchLower) return true;
            const hmacToken = generateHmacToken(o.id).toLowerCase();
            if (hmacToken === searchLower) return true;
          } catch {}

          // 4. Match Queue Ticket code or qrToken
          if (o.queueTicket) {
            if (
              o.queueTicket.code &&
              o.queueTicket.code.toUpperCase() === searchCode
            )
              return true;
            if (
              o.queueTicket.code &&
              o.queueTicket.code.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
                searchNormalized
            )
              return true;
            if (
              o.queueTicket.qrToken &&
              o.queueTicket.qrToken.toLowerCase() === searchLower
            )
              return true;
          }

          // 5. Match by ID prefix / suffix (e.g. ORD-42691 or first 8 chars of UUID)
          if (o.id.toLowerCase() === searchLower) return true;
          if (
            searchLower.length >= 6 &&
            o.id.toLowerCase().startsWith(searchLower)
          )
            return true;

          return false;
        }) || null;

      // 6. Fallback: match by sequential computed code if orderCode was not stored
      if (!order && searchNormalized) {
        const typeOrders: Record<string, typeof allOrders> = {};
        for (const o of allOrders) {
          if (!typeOrders[o.type]) typeOrders[o.type] = [];
          typeOrders[o.type].push(o);
        }
        for (const type of Object.keys(typeOrders)) {
          typeOrders[type].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          const prefix =
            type === 'REPAIR'
              ? 'REP'
              : type === 'MANUFACTURE'
                ? 'FAB'
                : type === 'DESIGN'
                  ? 'DIS'
                  : type === 'LASER'
                    ? 'LAS'
                    : type === 'LAYAWAY'
                      ? 'APT'
                      : 'PED';
          for (let i = 0; i < typeOrders[type].length; i++) {
            const computed = `${prefix}-${i + 1}`;
            if (
              computed === searchCode ||
              computed.replace(/[^A-Z0-9]/g, '') === searchNormalized
            ) {
              order = typeOrders[type][i];
              break;
            }
          }
          if (order) break;
        }
      }
    }

    if (!order) return null;

    const countBefore = await this.prisma.order.count({
      where: {
        tenantId: order.tenantId,
        type: order.type,
        createdAt: { lte: order.createdAt },
      },
    });

    const prefix =
      order.type === 'REPAIR'
        ? 'REP'
        : order.type === 'MANUFACTURE'
          ? 'FAB'
          : order.type === 'LAYAWAY'
            ? 'APT'
            : 'PED';
    const sequenceNumber = countBefore;
    let computedCode = `${prefix}-${sequenceNumber}`;

    const specs = (order.specifications as any) || {};
    let orderCode = specs.orderCode || computedCode;
    const match = String(orderCode).match(/^([A-Z]+)-0*(\d+)$/i);
    if (match) {
      orderCode = `${match[1].toUpperCase()}-${match[2]}`;
    }

    return {
      ...order,
      sequenceNumber,
      orderCode,
      specifications: {
        ...specs,
        orderCode,
      },
    };
  }

  async advanceStatus(tenantId: string, id: string, user?: any) {
    if (user && isDesignerRole(user.role, user.email, user.name)) {
      throw new ForbiddenException(
        'El rol Diseñador no tiene permitido avanzar el estado de producción de la orden.',
      );
    }

    const order = await this.getOrder(tenantId, id);
    if (!order) throw new NotFoundException('Order not found');


    const strategy = this.strategyFactory.getStrategy(order.type);
    const specs = (order.specifications as any) || {};
    const userName = user?.name || user?.email || 'Joyero';

    // Specialized logic for Standard (OrderStage) vs others (OrderStatus)
    if (order.type === 'STANDARD') {
      const nextStage = (strategy as any).getNextStage(order.stage);
      if (nextStage) {
        const isReady = nextStage === 'LISTO_ENTREGA';
        const updated = await this.prisma.order.update({
          where: { id },
          data: {
            stage: nextStage,
            ...(nextStage === 'ENTREGADO_POSTVENTA'
              ? { deliveredAt: new Date() }
              : {}),
            ...(isReady
              ? {
                  specifications: {
                    ...specs,
                    readyByName: userName,
                    readyBy: {
                      id: user?.id,
                      name: userName,
                      email: user?.email,
                      role: user?.role,
                      at: new Date(),
                    },
                  },
                }
              : {}),
          },
        });
        this.notifyOrderWorkflowStatus(tenantId, id).catch((err) => {
          console.error('[Workflow WhatsApp Notification Error]', err);
        });
        return updated;
      }
    } else {
      const nextStatus = strategy.getNextStatus(order.status);
      if (nextStatus) {
        const isReady =
          nextStatus === 'REPAIR_COMPLETED' ||
          nextStatus === 'READY_FOR_PICKUP';
        const updated = await this.prisma.order.update({
          where: { id },
          data: {
            status: nextStatus,
            ...(nextStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
            ...(isReady
              ? {
                  specifications: {
                    ...specs,
                    readyByName: userName,
                    readyBy: {
                      id: user?.id,
                      name: userName,
                      email: user?.email,
                      role: user?.role,
                      at: new Date(),
                    },
                  },
                }
              : {}),
          },
        });
        this.notifyOrderWorkflowStatus(tenantId, id).catch((err) => {
          console.error('[Workflow WhatsApp Notification Error]', err);
        });
        return updated;
      }
    }
    return order; // No transition possible
  }

  async updateOrder(
    tenantId: string,
    id: string,
    data: any,
    currentUser?: any,
  ) {
    const order = await this.getOrder(tenantId, id);
    if (!order) throw new NotFoundException('Order not found');

    const userRole = currentUser?.role;
    const isAuthorized = isAdminRole(userRole, currentUser?.email);

    const currentStatusUpper = String(order.status || '').toUpperCase();
    const currentStageUpper = String(order.stage || '').toUpperCase();
    const statusIdx = STATUS_ORDER[currentStatusUpper];
    const stageIdx = STATUS_ORDER[currentStageUpper];
    const currentIdx = Math.max(statusIdx ?? 0, stageIdx ?? 0);
    const isReceived = currentIdx === 0;

    const isJoyeroUser =
      currentUser?.role === 'JOYERO' ||
      String(currentUser?.role || '').toUpperCase() === 'JOYERO' ||
      String(currentUser?.email || '')
        .toLowerCase()
        .includes('joyero') ||
      String(currentUser?.name || '')
        .toLowerCase()
        .includes('joyero');

    if (
      isJoyeroUser &&
      (data.promisedAt !== undefined || data.dueDate !== undefined)
    ) {
      throw new ForbiddenException(
        'El rol Joyero no tiene permisos para modificar la fecha de entrega.',
      );
    }

    // Si se cambia a devuelto, la orden pasa a RETURNED
    let isReturn = false;
    if (data.status) {
      const sUpper = String(data.status).toUpperCase();
      if (sUpper === 'RETURNED' || sUpper === 'DEVUELTO') {
        data.status = 'RETURNED';
        isReturn = true;
      }
    }
    if (data.stage) {
      const stUpper = String(data.stage).toUpperCase();
      if (stUpper === 'RETURNED' || stUpper === 'DEVUELTO') {
        data.stage = 'RECIBIDO';
        isReturn = true;
      }
    }

    if (!isAuthorized && currentUser) {
      // RF-01: Entrega física manual bloqueada para no administradores (debe ser vía QR)
      const targetStatus = String(data.status || '').toUpperCase();
      const targetStage = String(data.stage || '').toUpperCase();
      if (
        targetStatus === 'DELIVERED' ||
        targetStatus === 'ENTREGADO' ||
        targetStatus === 'ENTREGADO_POSTVENTA' ||
        targetStage === 'ENTREGADO_POSTVENTA' ||
        targetStage === 'ENTREGADO'
      ) {
        throw new ForbiddenException(
          'La entrega física a cliente no se puede realizar manualmente. Debe efectuarse mediante el escaneo del código QR validando saldo y entrega física.',
        );
      }

      // RF-06: Restricción para Diseñador (no puede marcar terminado final ni entregado)
      if (isDesignerRole(userRole, currentUser?.email, currentUser?.name)) {
        const isFinishing =
          ['REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'DELIVERED', 'ENTREGADO', 'TERMINADO'].includes(targetStatus) ||
          ['LISTO_ENTREGA', 'ENTREGADO_POSTVENTA', 'TERMINADO'].includes(targetStage);
        if (isFinishing) {
          throw new ForbiddenException(
            'El rol Diseñador no tiene permitido marcar trabajos como terminados o entregados. Su función es completar el diseño y asignar al Joyero.',
          );
        }
      }

      // 1. Si no es admin/system y la orden ya no está en RECIBIDO, no se pueden modificar campos de detalle
      if (!isReceived) {

        const detailKeys = [
          'pieceType',
          'value',
          'cost',
          'dueDate',
          'metal',
          'color',
          'karats',
          'weight',
          'size',
          'thickness',
          'itemCode',
          'laborCost',
          'materialCost',
          'clientId',
          'priority',
          'imageUrl',
        ];
        const hasDetailChanges = detailKeys.some((k) => data[k] !== undefined);
        if (hasDetailChanges) {
          throw new ForbiddenException(
            'Las órdenes en estado diferente a Recibido solo pueden ser modificadas por Administradores y Sistema.',
          );
        }
      }

      // 2. Si se actualiza el workflow (status o stage), no se permite ir hacia atrás excepto en devolución
      if (data.status && !isReturn) {
        const newStatusUpper = String(data.status).toUpperCase();
        const newIdx = STATUS_ORDER[newStatusUpper];
        if (newIdx !== undefined && newIdx < currentIdx) {
          throw new ForbiddenException(
            'No está permitido retroceder el estado del flujo de trabajo.',
          );
        }
      }
      if (data.stage && !isReturn) {
        const newStageUpper = String(data.stage).toUpperCase();
        const newIdx = STATUS_ORDER[newStageUpper];
        if (newIdx !== undefined && newIdx < currentIdx) {
          throw new ForbiddenException(
            'No está permitido retroceder el estado del flujo de trabajo.',
          );
        }
      }
    }

    const {
      pieceType,
      value,
      cost,
      priority,
      notes,
      dueDate,
      promisedAt,
      metal,
      color,
      karats,
      weight,
      size,
      thickness,
      itemCode,
      laborCost,
      materialCost,
      specifications,
      clientId,
      status,
      stage,
      imageUrl,
    } = data;

    // El modal de edición envía el estado del flujo en `status` y `stage`; `stage` usa otro enum
    // (OrderStage) y un valor como RECEIVED hacía fallar Prisma con 500. Solo se guarda si es válido.
    const stageValue =
      stage !== undefined &&
      stage !== null &&
      String(stage).toUpperCase() in OrderStage
        ? (String(stage).toUpperCase() as OrderStage)
        : undefined;
    const statusValue =
      status !== undefined &&
      status !== null &&
      String(status).toUpperCase() in OrderStatus
        ? (String(status).toUpperCase() as OrderStatus)
        : undefined;
    // Los campos de texto del item pueden llegar como número desde datos antiguos
    const textOrUndefined = (v: any) =>
      v === undefined || v === null ? undefined : String(v);

    if (clientId !== undefined) {
      await this.assertClientInTenant(tenantId, clientId);
    }

    // Recalculate totalAmount and balance if financial fields are changing
    const currentLabor = order.laborCost ? Number(order.laborCost) : 0;
    const currentMaterial = order.materialCost ? Number(order.materialCost) : 0;
    const currentValue = order.value ? Number(order.value) : 0;

    // RF-08: si la orden trae costos por pieza, los totales salen de la suma de las piezas
    const itemCosts = this.sumItemCosts(specifications?.items);
    const updatedLabor = itemCosts.hasCosts
      ? itemCosts.labor
      : laborCost !== undefined
        ? Number(laborCost)
        : currentLabor;
    const updatedMaterial = itemCosts.hasCosts
      ? itemCosts.material
      : materialCost !== undefined
        ? Number(materialCost)
        : currentMaterial;
    const updatedValue = itemCosts.hasCosts
      ? itemCosts.labor
      : value !== undefined
        ? Number(value)
        : currentValue;

    let totalAmount: Prisma.Decimal;

    // RF-08: el total a cobrar es mano de obra + material (suma de todas las piezas).
    // Priority: 1. Costos por pieza / mano de obra (si > 0), 2. Explicit value, 3. Existing totalAmount (if not zero), 4. Existing value
    if (itemCosts.hasCosts || (laborCost !== undefined && updatedLabor > 0)) {
      totalAmount = new Prisma.Decimal(updatedLabor).add(updatedMaterial);
    } else if (value !== undefined) {
      totalAmount = new Prisma.Decimal(updatedValue);
    } else {
      const currentTotal = order.totalAmount
        ? new Prisma.Decimal(order.totalAmount)
        : new Prisma.Decimal(0);
      if (currentTotal.isZero() && currentValue > 0) {
        totalAmount = new Prisma.Decimal(currentValue);
      } else {
        totalAmount = currentTotal;
      }
    }

    const paidAmount = order.paidAmount
      ? new Prisma.Decimal(order.paidAmount)
      : new Prisma.Decimal(0);
    const balance = totalAmount.sub(paidAmount);

    const isDelivering =
      status === 'DELIVERED' ||
      status === 'ENTREGADO' ||
      status === 'ENTREGADO_POSTVENTA';
    const specs = (order.specifications as any) || {};
    const isReadyStage =
      (status &&
        ['REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'LISTO_ENTREGA'].includes(
          String(status).toUpperCase(),
        )) ||
      (stage && ['LISTO_ENTREGA'].includes(String(stage).toUpperCase()));

    let finalSpecifications =
      specifications !== undefined ? specifications : specs;
    const userName = currentUser?.name || currentUser?.email || 'Joyero';

    if (isReturn) {
      finalSpecifications = {
        ...(typeof finalSpecifications === 'object' ? finalSpecifications : {}),
        returnedByName: userName,
        returnedBy: {
          id: currentUser?.id,
          name: userName,
          email: currentUser?.email,
          role: currentUser?.role,
          at: new Date(),
        },
        returnReason: 'Devuelto por joyero a recepción',
      };
    } else if (isReadyStage) {
      finalSpecifications = {
        ...(typeof finalSpecifications === 'object' ? finalSpecifications : {}),
        readyByName: userName,
        readyBy: {
          id: currentUser?.id,
          name: userName,
          email: currentUser?.email,
          role: currentUser?.role,
          at: new Date(),
        },
      };
    } else if (
      specs.readyByName &&
      typeof finalSpecifications === 'object' &&
      !finalSpecifications.readyByName
    ) {
      finalSpecifications.readyByName = specs.readyByName;
      finalSpecifications.readyBy = specs.readyBy;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        pieceType: textOrUndefined(pieceType),
        value: updatedValue,
        cost: itemCosts.hasCosts
          ? itemCosts.material
          : cost !== undefined
            ? Number(cost)
            : undefined,
        priority,
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        promisedAt:
          promisedAt !== undefined
            ? promisedAt
              ? new Date(promisedAt)
              : null
            : undefined,
        metal: textOrUndefined(metal),
        color: textOrUndefined(color),
        karats: textOrUndefined(karats),
        weight: textOrUndefined(weight),
        size: textOrUndefined(size),
        thickness: textOrUndefined(thickness),
        itemCode: textOrUndefined(itemCode),
        laborCost: updatedLabor,
        materialCost: updatedMaterial,
        totalAmount,
        balance,
        specifications: finalSpecifications,
        clientId,
        status: statusValue,
        stage: stageValue,
        imageUrl,
        ...(isDelivering ? { deliveredAt: new Date() } : {}),
      },
    });

    if (status && status !== order.status) {
      this.notifyOrderWorkflowStatus(tenantId, id).catch((err) => {
        console.error('[Workflow WhatsApp Notification Error]', err);
      });
    }

    return updated;
  }

  async generateAIImage(tenantId: string, id: string) {
    const order = await this.getOrder(tenantId, id);
    if (!order) throw new NotFoundException('Order not found');

    // Simulamos la generación con IA. En un caso real llamaríamos a OpenAI/DALL-E.
    // Por ahora usaremos una imagen de placeholder representativa de joyería
    const prompt = `Lujosa pieza de joyería: ${order.pieceType}, metal ${order.metal || 'oro'}, color ${order.color || 'natural'}. Estilo premium, fondo oscuro, iluminación cinematográfica.`;

    // Mock URL de una imagen generada (usaremos Unsplash para el demo)
    const mockImageUrl = `https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop`;

    return this.prisma.order.update({
      where: { id },
      data: { imageUrl: mockImageUrl },
    });
  }

  async deleteOrder(tenantId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { queueTicket: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.queueTicket) {
      await this.prisma.queueTicket.update({
        where: { id: order.queueTicket.id },
        data: { orderId: null },
      });
    }

    await this.prisma.payment.deleteMany({
      where: { orderId: id },
    });

    return this.prisma.order.delete({
      where: { id },
    });
  }

  async notifyOrderWorkflowStatus(tenantId: string, id: string) {
    try {
      await this.sendOrderWhatsApp(tenantId, id);
    } catch (error) {
      console.error('[Workflow WhatsApp Notification]', error);
    }
  }

  async sendOrderWhatsApp(tenantId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id, tenantId },
      include: { client: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const specs = (order.specifications as any) || {};
    const phone = order.client?.phone || specs.clientPhone || specs.phone;
    if (!phone) {
      console.warn(`[sendOrderWhatsApp] Order ${id} has no client phone.`);
      return {
        success: false,
        reason: 'El cliente no tiene teléfono configurado',
      };
    }

    const prefix =
      order.type === 'REPAIR'
        ? 'REP'
        : order.type === 'MANUFACTURE'
          ? 'FAB'
          : order.type === 'DESIGN'
            ? 'DIS'
            : order.type === 'LASER'
              ? 'LAS'
              : order.type === 'LAYAWAY'
                ? 'APT'
                : 'PED';
    const orderCode =
      specs.orderCode || `${prefix}-${order.id.substring(0, 6).toUpperCase()}`;
    const clientName = (
      order.client?.name ||
      specs.clientName ||
      'Cliente'
    ).toUpperCase();
    const formatDate = (date?: Date | string | null) => {
      const d = date ? new Date(date) : new Date();
      return d.toLocaleDateString('es-MX', {
        timeZone: 'America/Hermosillo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const dateStr = formatDate(order.createdAt);

    const getConcepto = (type: string) => {
      const t = (type || '').toUpperCase();
      if (t === 'REPAIR') return 'REPARACIÓN';
      if (t === 'MANUFACTURE') return 'FABRICACIÓN';
      if (t === 'DESIGN') return 'DISEÑO';
      if (t === 'LASER') return 'LÁSER';
      if (t === 'LAYAWAY') return 'APARTADO';
      return 'VENTA';
    };

    const getStatusLabel = (status: string) => {
      const s = (status || '').toUpperCase().trim();
      // Recibido
      if (
        [
          'RECEIVED',
          'DRAFT',
          'NUEVO',
          'PENDING',
          'INTERES_LEAD',
          'RECIBIDO',
        ].includes(s)
      )
        return 'RECIBIDO';

      // En Taller / En Proceso
      if (
        [
          'IN_REPAIR',
          'IN_PRODUCTION',
          'IN_PROGRESS',
          'IN_WORKSHOP',
          'TALLER',
          'PRODUCTION',
          'EN_PROCESO',
          'EN_PRODUCCION',
          'CONTROL_CALIDAD',
          'QUALITY_CHECK',
          'DIAGNOSIS_PENDING',
          'WAITING_PARTS',
          'SPEC_PENDING',
          'MATERIALS_PENDING',
          'EN TALLER',
        ].includes(s)
      )
        return 'EN TALLER';

      // Listo / Terminado
      if (
        [
          'REPAIR_COMPLETED',
          'READY_FOR_PICKUP',
          'READY',
          'COMPLETED',
          'TERMINADO',
          'LISTO',
          'LISTO_ENTREGA',
        ].includes(s)
      )
        return 'TERMINADO';

      // Entregado
      if (['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(s))
        return 'ENTREGADO';

      // Devuelto
      if (['RETURNED', 'DEVUELTO'].includes(s)) return 'DEVUELTO';

      // Cancelado
      if (['CANCELLED', 'CANCELADO'].includes(s)) return 'CANCELADO';

      // Cotizaciones / Aprobaciones
      if (['QUOTE_SENT', 'COTIZACION_ENVIADA'].includes(s)) return 'COTIZACIÓN';
      if (['APPROVED', 'APROBADO_ANTICIPO'].includes(s)) return 'APROBADO';
      if (['LAYAWAY_OPEN'].includes(s)) return 'APARTADO';
      if (['LAYAWAY_EXPIRED'].includes(s)) return 'VENCIDO';

      return s.replace(/_/g, ' ');
    };

    const rawStatus = order.status || (order as any).stage || 'RECIBIDO';
    const statusLabel = getStatusLabel(rawStatus);
    const isReceived = statusLabel === 'RECIBIDO' || statusLabel === 'APARTADO';
    const isReady = statusLabel === 'TERMINADO' || statusLabel === 'LISTO';

    // Regla: Solo los estatus RECIBIDO, APARTADO y TERMINADO envían WhatsApp
    if (!isReceived && !isReady) {
      console.log(
        `[sendOrderWhatsApp] Omitido: solo los estatus RECIBIDO, APARTADO y TERMINADO envían WhatsApp. Estatus actual: ${statusLabel}`,
      );
      return {
        success: false,
        reason:
          'Solo los estatus RECIBIDO, APARTADO y TERMINADO envían WhatsApp',
      };
    }

    const trackToken = generateTrackToken(order.id);
    const trackingUrl = `https://luxuryos.pitayacode.io/track/${trackToken}`;
    const settings = await this.prisma.setting.findMany({
      where: { tenantId },
    });
    const map = settings.reduce(
      (acc, curr) => ({ ...acc, [curr.key]: curr.value }),
      {} as Record<string, string>,
    );
    const codeType = map['label_code_type'] || 'BARCODE';

    // Usamos el enlace de tracking para el QR (para que al escanear abra el portal) y orderCode para barcode
    const qrImageUrl =
      codeType === 'QR'
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingUrl)}`
        : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${orderCode}&scale=3`;

    const pieceItems: any[] =
      specs.items && specs.items.length > 0
        ? specs.items
        : [
            {
              item: order.pieceType || 'PIEZA',
              metal: order.metal,
              color: order.color,
              karats: order.karats,
              weight: order.weight,
              size: order.size,
              thickness: order.thickness,
              description: order.notes,
            },
          ];

    const pieceSummaries = pieceItems
      .map((p, idx) => {
        const title = (
          p.item ||
          p.pieceType ||
          `Pieza ${idx + 1}`
        ).toUpperCase();
        const details: string[] = [];
        const metalParts = [p.metal, p.karats, p.color].filter(
          (v) => v && v !== '-',
        );
        if (metalParts.length > 0) details.push(metalParts.join(' '));
        const formatWeight = (w: any) => {
          const str = String(w || '').trim();
          if (!str || str === '-') return '';
          if (/(gr|g|grs|gr\.|g\.)$/i.test(str)) return str;
          return `${str} GR`;
        };

        if (p.weight && p.weight !== '-') details.push(formatWeight(p.weight));
        if (p.size && p.size !== '-') details.push(`Med: ${p.size}`);
        if (p.thickness && p.thickness !== '-') details.push(`${p.thickness}`);
        const note = p.description || p.notes || p.trabajo || p.work || '';

        let res = `• *${title}*`;
        if (details.length > 0) res += ` (${details.join(', ')})`;
        if (note) res += `\n  _Nota: ${note}_`;
        return res;
      })
      .join('\n');

    let message = '';
    if (isReceived) {
      message = `🔔 *CARED* 🔔

*Fecha:* ${dateStr}
*Cliente:* ${clientName}
*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}

📋 *Detalle de la Orden:*
${pieceSummaries}

${qrImageUrl}

🌐 *Ver seguimiento en línea:*
${trackingUrl}

Gracias por su preferencia. ✨`;
    } else if (isReady) {
      message = `🔔 *CARED* 🔔

*Fecha:* ${dateStr}
*Cliente:* ${clientName}
*No. Orden:* ${orderCode}
*Concepto:* ${getConcepto(order.type)}

📋 *Detalle de la Orden:*
${pieceSummaries}

${qrImageUrl}

🌐 *Ver seguimiento en línea:*
${trackingUrl}

Su pieza está lista para entrega en sucursal. Gracias por su preferencia. ✨`;
    }

    console.log(
      `[sendOrderWhatsApp] Sending WhatsApp notification for ${orderCode} to ${phone}`,
    );
    const result = await this.notificationService.sendCustomMessage(
      tenantId,
      phone,
      message,
    );
    console.log(`[sendOrderWhatsApp] Result for ${orderCode}:`, result);
    return result;
  }

  // RF-01: Automatización de entrega mediante código QR
  async deliverOrderViaQr(tenantId: string, idOrCode: string, user: any) {
    const order = await this.getOrder(tenantId, idOrCode);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const specs = (order.specifications as any) || {};
    const currentStatus = String(order.status || '').toUpperCase();
    const currentStage = String(order.stage || '').toUpperCase();

    // 1. Verificar si ya fue entregada previamente
    if (
      order.deliveredAt ||
      currentStatus === 'DELIVERED' ||
      currentStage === 'ENTREGADO_POSTVENTA'
    ) {
      throw new BadRequestException('Esta orden ya fue entregada anteriormente.');
    }

    // 2. Verificar si está cancelada o devuelta
    if (
      currentStatus === 'CANCELLED' ||
      currentStatus === 'RETURNED' ||
      specs.isReturned === true ||
      specs.isReturnedToClient === true
    ) {
      throw new BadRequestException(
        'No se puede entregar como terminada una orden cancelada o devuelta. Para este caso utilice la opción "Cancelar / Devolver trabajo".',
      );
    }

    // 3. Verificar estado de liberación por Joyero / Taller
    const isReady =
      currentStatus === 'REPAIR_COMPLETED' ||
      currentStatus === 'READY_FOR_PICKUP' ||
      currentStage === 'LISTO_ENTREGA' ||
      currentStatus === 'READY' ||
      currentStatus === 'LISTO' ||
      currentStatus === 'TERMINADO';

    if (!isReady) {
      throw new BadRequestException(
        'No se puede entregar una orden pendiente de producción. Debe ser liberada y marcada como Terminada por el Joyero primero.',
      );
    }

    // 4. Validar que no exista saldo pendiente
    const totalAmount = Number(
      order.totalAmount || order.laborCost || order.value || 0,
    );
    const paidAmount = Number(order.paidAmount || 0);
    const balance = Math.max(0, totalAmount - paidAmount);

    if (balance > 0.01) {
      throw new BadRequestException(
        `La orden tiene un saldo pendiente de $${balance.toLocaleString()} MXN. Es obligatorio liquidar el pago antes de confirmar la entrega física.`,
      );
    }

    const userName = user?.name || user?.email || 'Mostrador';
    const now = new Date();

    const updatedSpecs = {
      ...specs,
      deliveredByName: userName,
      deliveredBy: {
        id: user?.id,
        name: userName,
        email: user?.email,
        role: user?.role,
        at: now,
      },
      deliveryConfirmed: true,
      deliveryMethod: 'QR_SCAN',
    };

    const updateData: any = {
      deliveredAt: now,
      paymentStatus: 'PAGADO',
      balance: 0,
      specifications: updatedSpecs,
    };

    if (order.type === 'STANDARD') {
      updateData.stage = 'ENTREGADO_POSTVENTA';
    } else {
      updateData.status = 'DELIVERED';
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    // Notificación opcional de entrega
    this.notifyOrderWorkflowStatus(tenantId, order.id).catch((err) => {
      console.error('[Workflow WhatsApp Notification Delivery Error]', err);
    });

    return updated;
  }

  // RF-03: Cobro y entrega en un solo escaneo QR (Transaccional y consistente)
  async settleAndDeliverOrderViaQr(
    tenantId: string,
    idOrCode: string,
    user: any,
    paymentData?: { paymentMethod?: string; reference?: string },
  ) {
    const order = await this.getOrder(tenantId, idOrCode);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const specs = (order.specifications as any) || {};
    const currentStatus = String(order.status || '').toUpperCase();
    const currentStage = String(order.stage || '').toUpperCase();

    // 1. Verificar si ya fue entregada previamente (idempotencia)
    if (
      order.deliveredAt ||
      currentStatus === 'DELIVERED' ||
      currentStage === 'ENTREGADO_POSTVENTA'
    ) {
      throw new BadRequestException('Esta orden ya fue entregada anteriormente.');
    }

    // 2. Verificar si está cancelada o devuelta
    if (
      currentStatus === 'CANCELLED' ||
      currentStatus === 'RETURNED' ||
      specs.isReturned === true ||
      specs.isReturnedToClient === true
    ) {
      throw new BadRequestException(
        'No se puede entregar como terminada una orden cancelada o devuelta. Para este caso utilice la opción "Cancelar / Devolver trabajo".',
      );
    }

    // 3. Verificar estado de liberación por Joyero / Taller
    const isReady =
      currentStatus === 'REPAIR_COMPLETED' ||
      currentStatus === 'READY_FOR_PICKUP' ||
      currentStage === 'LISTO_ENTREGA' ||
      currentStatus === 'READY' ||
      currentStatus === 'LISTO' ||
      currentStatus === 'TERMINADO';

    if (!isReady) {
      throw new BadRequestException(
        'No se puede entregar una orden pendiente de producción. Debe ser liberada y marcada como Terminada por el Joyero primero.',
      );
    }

    const totalAmount = Number(
      order.totalAmount || order.laborCost || order.value || 0,
    );
    const paidAmount = Number(order.paidAmount || 0);
    const pendingBalance = Math.max(0, totalAmount - paidAmount);

    const userName = user?.name || user?.email || 'Mostrador';
    const now = new Date();

    const updatedSpecs = {
      ...specs,
      deliveredByName: userName,
      deliveredBy: {
        id: user?.id,
        name: userName,
        email: user?.email,
        role: user?.role,
        at: now,
      },
      deliveryConfirmed: true,
      deliveryMethod: 'QR_SCAN_SETTLE',
    };

    const updateData: any = {
      deliveredAt: now,
      paidAmount: totalAmount,
      balance: 0,
      paymentStatus: 'PAGADO',
      specifications: updatedSpecs,
    };

    if (order.type === 'STANDARD') {
      updateData.stage = 'ENTREGADO_POSTVENTA';
    } else {
      updateData.status = 'DELIVERED';
    }

    // Ejecutar de forma transaccional y consistente
    const updated = await this.prisma.$transaction(async (tx) => {
      // Si hay saldo pendiente, registrar el pago de liquidación en la misma transacción
      if (pendingBalance > 0.009) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: new Prisma.Decimal(pendingBalance),
            method: paymentData?.paymentMethod || 'Efectivo',
            reference: paymentData?.reference || (paymentData as any)?.notes || 'Liquidación en entrega QR',
            recordedBy: userName,
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: updateData,
        include: {
          client: true,
          createdBy: { select: { id: true, name: true, email: true } },
          payments: true,
        },
      });
    });

    // Notificación opcional de entrega
    this.notifyOrderWorkflowStatus(tenantId, order.id).catch((err) => {
      console.error('[Workflow WhatsApp Notification Delivery Error]', err);
    });

    return updated;
  }

  // RF-02: Cancelación y devolución de trabajos no realizados
  async returnOrderToClientViaQr(
    tenantId: string,
    idOrCode: string,
    user: any,
    reason?: string,
  ) {
    const order = await this.getOrder(tenantId, idOrCode);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const specs = (order.specifications as any) || {};
    const currentStatus = String(order.status || '').toUpperCase();

    // 1. Verificar el estado registrado por el Joyero
    const isMarkedReturnedOrCancelled =
      currentStatus === 'RETURNED' ||
      currentStatus === 'CANCELLED' ||
      specs.isReturned === true ||
      !!specs.returnedBy ||
      !!specs.returnReason;

    if (!isMarkedReturnedOrCancelled) {
      throw new BadRequestException(
        'El trabajo debe haber sido marcado como "Cancelado" o "Devuelto" por el Joyero antes de registrar la devolución física al cliente.',
      );
    }

    const effectiveReason = (reason || specs.returnReason || '').trim();
    if (!effectiveReason) {
      throw new BadRequestException(
        'Es obligatorio capturar el motivo de la devolución al cliente.',
      );
    }

    const userName = user?.name || user?.email || 'Mostrador';
    const now = new Date();

    const updatedSpecs = {
      ...specs,
      isReturnedToClient: true,
      isReturnedNotDone: true,
      returnReason: effectiveReason,
      returnedToClientAt: now,
      returnedToClientByName: userName,
      returnedToClientBy: {
        id: user?.id,
        name: userName,
        email: user?.email,
        role: user?.role,
        at: now,
      },
    };

    // Conservar estado de cancelación o devolución original, sin convertirlo en reparación terminada
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: currentStatus === 'CANCELLED' ? 'CANCELLED' : 'RETURNED',
        deliveredAt: now, // Dejará de generar alertas operativas de retraso
        specifications: updatedSpecs,
      },
    });

    return updated;
  }

  // RF-05: Completar diseño
  async completeDesign(
    tenantId: string,
    id: string,
    user: any,
    designData: { notes?: string; images?: string[] },
  ) {
    const order = await this.getOrder(tenantId, id);
    if (!order) throw new NotFoundException('Orden no encontrada');

    const userName = user?.name || user?.email || 'Diseñador';
    const now = new Date();
    const specs = (order.specifications as any) || {};

    const updatedSpecs = {
      ...specs,
      requiresDesign: true,
      designCompleted: true,
      designCompletedAt: now,
      designCompletedByName: userName,
      designCompletedBy: {
        id: user?.id,
        name: userName,
        email: user?.email,
        role: user?.role,
        at: now,
      },
      designNotes:
        designData?.notes !== undefined ? designData.notes : specs.designNotes,
      designAttachments:
        designData?.images || specs.designAttachments || [],
      designStatus: 'COMPLETED',
    };

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        specifications: updatedSpecs,
      },
    });

    return updated;
  }

  // RF-05: Asignar a Joyero tras completar diseño
  async assignJewelerAfterDesign(
    tenantId: string,
    id: string,
    user: any,
    jewelerName: string,
    jewelerId?: string,
  ) {
    const order = await this.getOrder(tenantId, id);
    if (!order) throw new NotFoundException('Orden no encontrada');

    const specs = (order.specifications as any) || {};
    if (!specs.designCompleted && (specs.requiresDesign || order.type === 'DESIGN')) {
      throw new BadRequestException(
        'El diseño debe estar marcado como completado antes de poder asignar el trabajo al Joyero.',
      );
    }

    if (!jewelerName || !jewelerName.trim()) {
      throw new BadRequestException('Debe seleccionar un Joyero válido.');
    }

    const userName = user?.name || user?.email || 'Diseñador';
    const now = new Date();

    const updatedSpecs = {
      ...specs,
      assignedTo: jewelerName.trim(),
      assignedJeweler: jewelerName.trim(),
      jewelerId: jewelerId || specs.jewelerId,
      jewelerAssignedAt: now,
      jewelerAssignedByName: userName,
      jewelerAssignedBy: {
        id: user?.id,
        name: userName,
        email: user?.email,
        role: user?.role,
        at: now,
      },
    };

    const nextStatus =
      order.type === 'MANUFACTURE' ? 'IN_PRODUCTION' : 'IN_REPAIR';

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        specifications: updatedSpecs,
      },
    });

    return updated;
  }
}

