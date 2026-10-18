import { Injectable } from '@nestjs/common';
import { OrderStatus, OrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminRole } from '../common/roles.util';
import { AuraToolContext } from './aura-token';

export interface AuraToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  QUOTE_SENT: 'Cotización enviada',
  APPROVED: 'Aprobado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
  DELIVERED: 'Entregado',
  RECEIVED: 'Recibido',
  DIAGNOSIS_PENDING: 'Diagnóstico pendiente',
  WAITING_PARTS: 'Esperando piezas',
  IN_REPAIR: 'En taller',
  REPAIR_COMPLETED: 'Terminado',
  SPEC_PENDING: 'Especificaciones pendientes',
  MATERIALS_PENDING: 'Materiales pendientes',
  IN_PRODUCTION: 'En producción',
  QUALITY_CHECK: 'Control de calidad',
  READY_FOR_PICKUP: 'Listo para entrega',
};

const IN_WORKSHOP_STATUSES: OrderStatus[] = [
  'DIAGNOSIS_PENDING',
  'WAITING_PARTS',
  'IN_REPAIR',
  'MATERIALS_PENDING',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
] as OrderStatus[];

const WORKSHOP_TYPES = ['REPAIR', 'MANUFACTURE', 'DESIGN', 'LASER'];
const ORDER_CODE = /^[A-Z0-9-]{2,20}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_LIST = 10;

const label = (status?: string | null) => STATUS_LABELS[String(status || '')] || String(status || '');
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));
const isoDate = (d?: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/**
 * Herramientas de SOLO LECTURA que Aura puede pedir. Solo están disponibles para administradores (acceso
 * completo: montos, costos y ventas); cualquier otro rol no recibe herramientas y el callback las rechaza.
 * Siempre filtran por tenant y nunca se ejecuta SQL libre.
 */
@Injectable()
export class AuraToolsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(ctx: AuraToolContext) {
    return isAdminRole(ctx.role, ctx.email);
  }

  getDefinitions(ctx: AuraToolContext): AuraToolDefinition[] {
    if (!this.isAdmin(ctx)) return [];
    const defs: AuraToolDefinition[] = [
      {
        name: 'buscar_orden',
        description: 'Busca una orden por su código (por ejemplo REP-54 o FAB-14) y devuelve su estado, cliente, pieza, entrega y asignación.',
        parameters: {
          type: 'object',
          properties: { codigo: { type: 'string', description: 'Código de la orden, por ejemplo REP-54' } },
          required: ['codigo'],
        },
      },
      {
        name: 'ordenes_en_taller',
        description: 'Lista las órdenes que están actualmente en taller (en reparación, producción o control de calidad) con conteo por estado.',
        parameters: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: WORKSHOP_TYPES, description: 'Filtra por tipo de orden (opcional)' },
          },
        },
      },
    ];
    defs.push({
      name: 'ventas_del_mes',
      description: 'Resumen de ventas de un mes: número de órdenes, total vendido, total cobrado y desglose por tipo.',
      parameters: {
        type: 'object',
        properties: { mes: { type: 'string', description: 'Mes en formato AAAA-MM (opcional, por defecto el mes actual)' } },
      },
    });
    return defs;
  }

  async execute(ctx: AuraToolContext, name: string, args: Record<string, any> = {}): Promise<Record<string, any>> {
    const allowed = this.getDefinitions(ctx).some((d) => d.name === name);
    if (!allowed) return { error: 'Herramienta no disponible para este usuario.' };

    switch (name) {
      case 'buscar_orden':
        return this.buscarOrden(ctx, args.codigo);
      case 'ordenes_en_taller':
        return this.ordenesEnTaller(ctx, args.tipo);
      case 'ventas_del_mes':
        return this.ventasDelMes(ctx, args.mes);
      default:
        return { error: 'Herramienta no disponible para este usuario.' };
    }
  }

  private async buscarOrden(ctx: AuraToolContext, codigo?: string) {
    const code = String(codigo || '').trim().toUpperCase();
    if (!ORDER_CODE.test(code)) return { error: 'Código de orden inválido. Ejemplo: REP-54.' };

    const order = await this.prisma.order.findFirst({
      where: { tenantId: ctx.tenantId, specifications: { path: '$.orderCode', equals: code } },
      include: { client: { select: { name: true } } },
    });
    if (!order) return { encontrada: false, mensaje: `No existe la orden ${code}.` };

    const specs = (order.specifications as any) || {};
    return {
      encontrada: true,
      codigo: code,
      tipo: order.type,
      estado: label(order.status),
      cliente: order.client?.name,
      pieza: order.pieceType,
      prioridad: order.priority,
      entrega_prometida: isoDate(order.promisedAt || order.dueDate),
      asignado_a: specs.assignedTo || specs.assignedJeweler || null,
      recibida: isoDate(order.createdAt),
      total: num(order.totalAmount),
      pagado: num(order.paidAmount),
      saldo: num(order.balance),
      mano_de_obra: num(order.laborCost),
      material: num(order.materialCost),
    };
  }

  private async ordenesEnTaller(ctx: AuraToolContext, tipo?: string) {
    const type = tipo && WORKSHOP_TYPES.includes(String(tipo).toUpperCase()) ? (String(tipo).toUpperCase() as OrderType) : undefined;
    const where = { tenantId: ctx.tenantId, status: { in: IN_WORKSHOP_STATUSES }, ...(type ? { type } : {}) };

    const [grouped, orders] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ promisedAt: 'asc' }, { createdAt: 'asc' }],
        take: MAX_LIST,
        include: { client: { select: { name: true } } },
      }),
    ]);

    return {
      total: grouped.reduce((acc, g) => acc + g._count._all, 0),
      por_estado: grouped.map((g) => ({ estado: label(g.status), cantidad: g._count._all })),
      mas_proximas_a_entregar: orders.map((o) => {
        const specs = (o.specifications as any) || {};
        return {
          codigo: specs.orderCode || null,
          pieza: o.pieceType,
          cliente: o.client?.name,
          estado: label(o.status),
          entrega_prometida: isoDate(o.promisedAt || o.dueDate),
          asignado_a: specs.assignedTo || specs.assignedJeweler || null,
        };
      }),
      nota: `Se muestran como máximo ${MAX_LIST} órdenes.`,
    };
  }

  private async ventasDelMes(ctx: AuraToolContext, mes?: string) {
    const now = new Date();
    const month = mes && MONTH.test(mes) ? mes : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const [year, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, m - 1, 1));
    const to = new Date(Date.UTC(year, m, 1));
    const where = { tenantId: ctx.tenantId, createdAt: { gte: from, lt: to }, status: { not: 'CANCELLED' as OrderStatus } };

    const [totals, byType] = await Promise.all([
      this.prisma.order.aggregate({ where, _count: { _all: true }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.order.groupBy({ by: ['type'], where, _count: { _all: true }, _sum: { totalAmount: true } }),
    ]);

    return {
      mes: month,
      ordenes: totals._count._all,
      total_vendido: num(totals._sum.totalAmount),
      total_cobrado: num(totals._sum.paidAmount),
      por_tipo: byType.map((t) => ({ tipo: t.type, ordenes: t._count._all, total: num(t._sum.totalAmount) })),
    };
  }
}
