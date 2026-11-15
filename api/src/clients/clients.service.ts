import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminRole } from '../common/roles.util';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

export interface PortalAccessPayload {
  enable?: boolean;
  username?: string;
  email?: string;
  password?: string;
}

export interface ClientResponse {
  id: string;
  type: ClientType;
  status: string;
  portalAccess: {
    enabled: boolean;
    userId: string | null;
    username: string | null;
    email: string | null;
    role: Role | null;
  };
  [key: string]: unknown;
}

const RESELLER_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
} as const;

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private normalizeClientType(raw: any): ClientType {
    const normalized = String(raw || '').trim().toUpperCase();
    if (normalized === 'VIP') return ClientType.VIP;
    if (normalized === 'RESELLER' || normalized === 'REVENDEDOR') {
      return ClientType.RESELLER;
    }
    return ClientType.RETAIL;
  }

  private normalizeTags(raw: any): string[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of raw) {
      const tag = String(entry ?? '').trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
    }
    return result;
  }

  private normalizePortalUsername(raw: any): string | null {
    if (raw === undefined || raw === null) return null;
    const value = String(raw).trim().toLowerCase();
    if (!value) return null;
    if (!/^[a-z0-9._-]{3,30}$/.test(value)) {
      throw new BadRequestException(
        'El usuario del portal debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.',
      );
    }
    return value;
  }

  private assertAdminForPortalChange(
    currentUser: any,
    portalAccess: PortalAccessPayload | undefined,
    existingResellerUserId?: string | null,
  ) {
    if (!portalAccess) return;
    const requestsEnable = portalAccess.enable === true;
    const requestsDisable = portalAccess.enable === false && Boolean(existingResellerUserId);
    if (!requestsEnable && !requestsDisable) return;

    const isAdmin = currentUser
      ? isAdminRole(currentUser.role, currentUser.email)
      : false;
    if (!isAdmin) {
      throw new ForbiddenException(
        'Solo un administrador puede configurar el acceso al portal de revendedores.',
      );
    }
  }

  private formatClientResponse(client: any, canViewFinancials: boolean): ClientResponse {
    const clientOrders = client.orders || [];

    const validOrders = clientOrders.filter((o: any) => {
      const s = String(o.status || o.stage || '').toUpperCase();
      return s !== 'CANCELLED' && s !== 'CANCELADO';
    });

    const totalSpentNum = validOrders.reduce((sum: number, o: any) => {
      const total = parseFloat(String(o.totalAmount || '0')) || 0;
      const val = parseFloat(String(o.value || '0')) || 0;
      const paid = parseFloat(String(o.paidAmount || '0')) || 0;
      const amount = total > 0 ? total : val > 0 ? val : paid;
      return sum + amount;
    }, 0);

    const lastOrderDate =
      clientOrders.length > 0 && clientOrders[0].createdAt
        ? clientOrders[0].createdAt
        : null;

    const type: ClientType = client.type || ClientType.RETAIL;
    const tags: string[] = Array.isArray(client.tags)
      ? client.tags.map((t: any) => String(t))
      : [];
    const status =
      type === ClientType.RESELLER
        ? 'Revendedor'
        : type === ClientType.VIP
          ? 'VIP'
          : 'Active';

    const portalAccess = client.resellerUser
      ? {
          enabled: client.resellerUser.isActive !== false,
          userId: client.resellerUser.id,
          username: client.resellerUser.username ?? null,
          email: client.resellerUser.email,
          role: client.resellerUser.role,
        }
      : {
          enabled: false,
          userId: null,
          username: null,
          email: null,
          role: null,
        };

    return {
      ...client,
      type,
      tags,
      status,
      portalAccess,
      totalSpentNumber: canViewFinancials ? totalSpentNum : null,
      totalSpent: canViewFinancials
        ? `${Number(totalSpentNum.toFixed(2)).toLocaleString('es-MX')} MXN`
        : null,
      lastOrderDate,
      lastOrder: lastOrderDate
        ? new Date(lastOrderDate).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
      ordersCount: clientOrders.length,
    };
  }

  private async provisionOrUpdateResellerUserInTx(
    tx: any,
    tenantId: string,
    clientData: { name: string; email?: string | null; type: ClientType },
    existingClient: { id?: string; email?: string | null; resellerUserId?: string | null } | null,
    portalAccess?: PortalAccessPayload,
  ): Promise<string | null> {
    const currentLinkId = existingClient?.resellerUserId ?? null;
    if (!portalAccess) {
      return currentLinkId;
    }

    if (portalAccess.enable === false) {
      if (currentLinkId) {
        await tx.user.update({
          where: { id: currentLinkId, tenantId },
          data: { isActive: false },
        });
      }
      return currentLinkId;
    }

    if (portalAccess.enable !== true) {
      return currentLinkId;
    }

    if (clientData.type !== ClientType.RESELLER) {
      throw new BadRequestException(
        'Solo los clientes con tipo Revendedor pueden tener acceso al portal.',
      );
    }

    const username = this.normalizePortalUsername(portalAccess.username);
    if (!username) {
      throw new BadRequestException(
        'El nombre de usuario del portal es obligatorio (3 a 30 caracteres).',
      );
    }

    const rawEmail = String(
      portalAccess.email ??
        clientData.email ??
        existingClient?.email ??
        '',
    )
      .trim()
      .toLowerCase();
    const portalEmail = rawEmail || `${username}@revendedor.cared.mx`;

    const rawPassword =
      typeof portalAccess.password === 'string'
        ? portalAccess.password.trim()
        : '';
    if (rawPassword && rawPassword.length < 10) {
      throw new BadRequestException(
        'La contraseña del portal debe tener al menos 10 caracteres.',
      );
    }

    if (currentLinkId) {
      const conflictUser = await tx.user.findFirst({
        where: {
          NOT: { id: currentLinkId },
          OR: [{ username }, { email: portalEmail }],
        },
        select: { id: true, username: true, email: true },
      });
      if (conflictUser) {
        if (conflictUser.username === username) {
          throw new ConflictException(
            'Ese nombre de usuario del portal ya está en uso.',
          );
        }
        throw new ConflictException(
          'Ese correo ya pertenece a otra cuenta de usuario.',
        );
      }

      const updateUserData: any = {
        name: clientData.name,
        username,
        email: portalEmail,
        role: Role.REVENDEDOR,
        isActive: true,
      };
      if (rawPassword) {
        updateUserData.passwordHash = await bcrypt.hash(rawPassword, 10);
      }

      await tx.user.update({
        where: { id: currentLinkId },
        data: updateUserData,
      });
      return currentLinkId;
    }

    // Buscar si existe un User revendedor libre en el mismo tenant o conflicto global
    const candidates = await tx.user.findMany({
      where: {
        OR: [{ username }, { email: portalEmail }],
      },
      include: {
        clientProfile: { select: { id: true } },
      },
    });

    const reusableReseller = candidates.find(
      (u: any) =>
        u.tenantId === tenantId &&
        u.role === Role.REVENDEDOR &&
        !u.clientProfile,
    );

    const blockingUser = candidates.find(
      (u: any) => !reusableReseller || u.id !== reusableReseller.id,
    );
    if (blockingUser) {
      if (blockingUser.username === username) {
        throw new ConflictException(
          'Ese nombre de usuario del portal ya está en uso.',
        );
      }
      throw new ConflictException(
        'Ese correo ya pertenece a otra cuenta de usuario.',
      );
    }

    if (reusableReseller) {
      const updateUserData: any = {
        name: clientData.name,
        username,
        email: portalEmail,
        isActive: true,
      };
      if (rawPassword) {
        updateUserData.passwordHash = await bcrypt.hash(rawPassword, 10);
      }
      await tx.user.update({
        where: { id: reusableReseller.id },
        data: updateUserData,
      });
      return reusableReseller.id;
    }

    if (!rawPassword || rawPassword.length < 10) {
      throw new BadRequestException(
        'La contraseña inicial del portal debe tener al menos 10 caracteres.',
      );
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const createdUser = await tx.user.create({
      data: {
        tenantId,
        name: clientData.name,
        username,
        email: portalEmail,
        role: Role.REVENDEDOR,
        passwordHash,
        isActive: true,
      },
    });
    return createdUser.id;
  }

  async findAll(tenantId: string, user?: any) {
    const canViewFinancials = user
      ? isAdminRole(user.role, user.email)
      : true;

    const clients = await this.prisma.client.findMany({
      where: { tenantId },
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            value: true,
            status: true,
            stage: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        resellerUser: {
          select: RESELLER_USER_SELECT,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return clients.map((client) =>
      this.formatClientResponse(client, canViewFinancials),
    );
  }

  async create(tenantId: string, data: CreateClientDto, currentUser?: any): Promise<ClientResponse> {
    const { name, email, phone, location, portalAccess } = data;
    if (!name || !String(name).trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }

    const clientType =
      data.type !== undefined
        ? this.normalizeClientType(data.type)
        : ClientType.RETAIL;
    const normalizedName = String(name).toUpperCase().trim();
    const normalizedEmail =
      email !== undefined && String(email).trim()
        ? String(email).trim()
        : undefined;
    const normalizedTags =
      data.tags !== undefined ? this.normalizeTags(data.tags) : undefined;

    this.assertAdminForPortalChange(currentUser, portalAccess, null);

    const canViewFinancials = currentUser
      ? isAdminRole(currentUser.role, currentUser.email)
      : true;

    return this.prisma.$transaction(async (tx) => {
      const resellerUserId = await this.provisionOrUpdateResellerUserInTx(
        tx,
        tenantId,
        {
          name: normalizedName,
          email: normalizedEmail ?? null,
          type: clientType,
        },
        null,
        portalAccess,
      );

      const created = await tx.client.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          phone,
          location,
          type: clientType,
          ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
          ...(resellerUserId ? { resellerUserId } : {}),
          tenantId,
        },
        include: {
          resellerUser: { select: RESELLER_USER_SELECT },
        },
      });

      return this.formatClientResponse(created, canViewFinancials);
    });
  }

  async update(tenantId: string, id: string, data: UpdateClientDto, currentUser?: any): Promise<ClientResponse> {
    const { name, email, phone, location, portalAccess } = data;
    if (name !== undefined && (!name || !String(name).trim())) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }

    const canViewFinancials = currentUser
      ? isAdminRole(currentUser.role, currentUser.email)
      : true;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.client.findFirst({
        where: { id, tenantId },
        include: {
          resellerUser: { select: RESELLER_USER_SELECT },
        },
      });
      if (!existing) {
        throw new NotFoundException('Cliente no encontrado en este taller.');
      }

      this.assertAdminForPortalChange(
        currentUser,
        portalAccess,
        existing.resellerUserId,
      );

      const nextType =
        data.type !== undefined
          ? this.normalizeClientType(data.type)
          : existing.type || ClientType.RETAIL;
      const effectivePortalAccess =
        portalAccess ??
        (nextType !== ClientType.RESELLER && existing.resellerUserId
          ? { enable: false }
          : undefined);
      this.assertAdminForPortalChange(
        currentUser,
        effectivePortalAccess,
        existing.resellerUserId,
      );
      const nextName = name
        ? String(name).toUpperCase().trim()
        : existing.name;
      const nextEmail =
        email !== undefined
          ? String(email).trim() || null
          : existing.email;
      const normalizedTags =
        data.tags !== undefined ? this.normalizeTags(data.tags) : undefined;

      const resellerUserId = await this.provisionOrUpdateResellerUserInTx(
        tx,
        tenantId,
        {
          name: nextName,
          email: nextEmail,
          type: nextType,
        },
        existing,
        effectivePortalAccess,
      );

      const updated = await tx.client.update({
        where: { id, tenantId },
        data: {
          name: nextName,
          email: email !== undefined ? nextEmail : undefined,
          phone,
          location,
          ...(data.type !== undefined ? { type: nextType } : {}),
          ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
          ...(effectivePortalAccess !== undefined ? { resellerUserId } : {}),
        },
        include: {
          resellerUser: { select: RESELLER_USER_SELECT },
        },
      });

      return this.formatClientResponse(updated, canViewFinancials);
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id, tenantId },
        select: { id: true, resellerUserId: true },
      });
      if (!client) {
        throw new BadRequestException('Cliente no encontrado en este taller.');
      }
      const orders = await tx.order.findMany({
        where: { clientId: id, tenantId },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.queueTicket.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null },
        });
        await tx.order.deleteMany({
          where: { id: { in: orderIds }, tenantId },
        });
      }
      if (client.resellerUserId) {
        await tx.user.update({
          where: { id: client.resellerUserId, tenantId },
          data: { isActive: false },
        });
      }
      return tx.client.delete({
        where: { id },
      });
    });
  }

  async getHistory(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      include: {
        orders: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            payments: true,
            queueTicket: { select: { id: true, code: true, qrToken: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente no encontrado en este taller.');
    }

    const orders = (client.orders || []).map((order) => {
      const specs = (order.specifications as any) || {};
      const orderCode = specs.orderCode || `ORD-${order.id.slice(0, 8)}`;
      const jeweler =
        specs.assignedTo ||
        specs.assignedJeweler ||
        specs.readyByName ||
        null;
      const designer = specs.designerName || null;
      const isReturned =
        order.status === 'RETURNED' ||
        specs.isReturned === true ||
        specs.isReturnedToClient === true;

      return {
        id: order.id,
        orderCode,
        type: order.type,
        pieceType: order.pieceType,
        metal: order.metal,
        color: order.color,
        karats: order.karats,
        weight: order.weight,
        size: order.size,
        thickness: order.thickness,
        itemCode: order.itemCode,
        laborCost: order.laborCost,
        materialCost: order.materialCost,
        notes: order.notes,
        status: order.status,
        stage: order.stage,
        priority: order.priority,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        balance: order.balance,
        value: order.value,
        imageUrl: order.imageUrl,
        specifications: order.specifications,
        createdAt: order.createdAt,
        dueDate: order.dueDate,
        promisedAt: order.promisedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        jeweler,
        designer,
        isReturned,
        returnReason: specs.returnReason || null,
        returnedToClientAt: specs.returnedToClientAt || null,
        envelopeImages: specs.envelopeImages || [],
        payments: order.payments,
        createdBy: order.createdBy,
      };
    });

    return {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        location: client.location,
        type: client.type,
        createdAt: client.createdAt,
      },
      orders,
      totalOrders: orders.length,
    };
  }
}
