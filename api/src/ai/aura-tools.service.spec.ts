import { AuraToolsService } from './aura-tools.service';

const admin = { tenantId: 'tenant-1', role: 'TENANT_ADMIN', email: 'admin@cared.test' };
const vendedor = { tenantId: 'tenant-1', role: 'VENDEDOR', email: 'ventas@cared.test' };
const joyero = { tenantId: 'tenant-1', role: 'JOYERO', email: 'joyero@cared.test' };

const dbOrder = {
  type: 'REPAIR',
  status: 'IN_REPAIR',
  pieceType: 'Anillo de oro',
  priority: 'MEDIA',
  promisedAt: new Date('2026-10-17T12:00:00.000Z'),
  dueDate: null,
  createdAt: new Date('2026-10-17T20:01:00.000Z'),
  totalAmount: 650,
  paidAmount: 0,
  balance: 650,
  laborCost: 650,
  materialCost: 200,
  client: { name: 'JUAN CARLOS NAVARRO' },
  specifications: { orderCode: 'REP-54', assignedTo: 'Joyero Uno' },
};

describe('AuraToolsService', () => {
  let prisma: any;
  let service: AuraToolsService;

  beforeEach(() => {
    prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue(dbOrder),
        findMany: jest.fn().mockResolvedValue([dbOrder]),
        groupBy: jest.fn().mockResolvedValue([{ status: 'IN_REPAIR', _count: { _all: 3 } }]),
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 4 }, _sum: { totalAmount: 2600, paidAmount: 650 } }),
      },
    };
    service = new AuraToolsService(prisma);
  });

  describe('getDefinitions', () => {
    it('solo expone ventas_del_mes a administradores', () => {
      expect(service.getDefinitions(admin).map((d) => d.name)).toContain('ventas_del_mes');
      expect(service.getDefinitions(vendedor).map((d) => d.name)).not.toContain('ventas_del_mes');
      expect(service.getDefinitions(joyero).map((d) => d.name)).toEqual(['buscar_orden', 'ordenes_en_taller']);
    });
  });

  describe('execute', () => {
    it('rechaza herramientas no disponibles para el rol o desconocidas', async () => {
      expect(await service.execute(vendedor, 'ventas_del_mes', {})).toEqual({ error: expect.any(String) });
      expect(await service.execute(admin, 'borrar_todo', {})).toEqual({ error: expect.any(String) });
      expect(prisma.order.aggregate).not.toHaveBeenCalled();
    });

    it('buscar_orden valida el código y siempre filtra por tenant', async () => {
      expect(await service.execute(admin, 'buscar_orden', { codigo: "REP-54'; DROP TABLE" })).toEqual({ error: expect.any(String) });
      expect(prisma.order.findFirst).not.toHaveBeenCalled();

      await service.execute(vendedor, 'buscar_orden', { codigo: ' rep-54 ' });
      expect(prisma.order.findFirst.mock.calls[0][0].where).toEqual({
        tenantId: 'tenant-1',
        specifications: { path: '$.orderCode', equals: 'REP-54' },
      });
    });

    it('buscar_orden: admin ve montos y costos, vendedor solo montos, joyero ninguno', async () => {
      const asAdmin: any = await service.execute(admin, 'buscar_orden', { codigo: 'REP-54' });
      expect(asAdmin).toMatchObject({ codigo: 'REP-54', estado: 'En taller', asignado_a: 'Joyero Uno', saldo: 650, mano_de_obra: 650, material: 200 });

      const asVendedor: any = await service.execute(vendedor, 'buscar_orden', { codigo: 'REP-54' });
      expect(asVendedor.saldo).toBe(650);
      expect(asVendedor.material).toBeUndefined();
      expect(asVendedor.mano_de_obra).toBeUndefined();

      const asJoyero: any = await service.execute(joyero, 'buscar_orden', { codigo: 'REP-54' });
      expect(asJoyero.saldo).toBeUndefined();
      expect(asJoyero.total).toBeUndefined();
      expect(asJoyero.material).toBeUndefined();
    });

    it('buscar_orden no expone teléfono ni correo del cliente', async () => {
      const result = JSON.stringify(await service.execute(admin, 'buscar_orden', { codigo: 'REP-54' }));
      expect(result).not.toMatch(/phone|telefono|email|correo/i);
    });

    it('buscar_orden indica cuando la orden no existe', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      expect(await service.execute(admin, 'buscar_orden', { codigo: 'REP-999' })).toMatchObject({ encontrada: false });
    });

    it('ordenes_en_taller filtra por tenant, limita a 10 y respeta el tipo', async () => {
      const result: any = await service.execute(joyero, 'ordenes_en_taller', { tipo: 'repair' });
      expect(result.total).toBe(3);
      expect(prisma.order.findMany.mock.calls[0][0]).toMatchObject({ take: 10, where: { tenantId: 'tenant-1', type: 'REPAIR' } });
      expect(result.mas_proximas_a_entregar[0]).toMatchObject({ codigo: 'REP-54', estado: 'En taller' });

      await service.execute(joyero, 'ordenes_en_taller', { tipo: 'DROP' });
      expect(prisma.order.findMany.mock.calls[1][0].where.type).toBeUndefined();
    });

    it('ventas_del_mes usa el mes pedido, excluye cancelados y filtra por tenant', async () => {
      prisma.order.groupBy.mockResolvedValue([{ type: 'REPAIR', _count: { _all: 4 }, _sum: { totalAmount: 2600 } }]);
      const result: any = await service.execute(admin, 'ventas_del_mes', { mes: '2026-09' });
      expect(result).toMatchObject({
        mes: '2026-09',
        ordenes: 4,
        total_vendido: 2600,
        total_cobrado: 650,
        por_tipo: [{ tipo: 'REPAIR', ordenes: 4, total: 2600 }],
      });
      const where = prisma.order.aggregate.mock.calls[0][0].where;
      expect(where.tenantId).toBe('tenant-1');
      expect(where.status).toEqual({ not: 'CANCELLED' });
      expect(where.createdAt.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(where.createdAt.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    });
  });
});
