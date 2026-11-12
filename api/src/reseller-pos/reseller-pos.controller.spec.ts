import { CommerceSaleStatus, Role, SalesChannel } from '@prisma/client';
import { ResellerPosController } from './reseller-pos.controller';

describe('ResellerPosController', () => {
  const service = {
    getProfile: jest.fn(),
    getCatalog: jest.fn(),
    getInventory: jest.fn(),
    createCatalogProduct: jest.fn(),
  };
  const commerceService = {
    listSales: jest.fn(),
    getSale: jest.fn(),
    checkout: jest.fn(),
    cancelSale: jest.fn(),
  };
  const controller = new ResellerPosController(service as any, commerceService as any);

  beforeEach(() => jest.resetAllMocks());

  it('passes the authenticated reseller unchanged to the profile service', () => {
    const user = {
      id: 'reseller-1',
      name: 'María',
      tenantId: 'tenant-1',
      role: 'REVENDEDOR' as const,
    };

    controller.getProfile({ user });

    expect(service.getProfile).toHaveBeenCalledWith(user);
  });

  it('uses only the authenticated tenant when loading the catalog', () => {
    controller.getCatalog({ user: { tenantId: 'tenant-1' } });

    expect(service.getCatalog).toHaveBeenCalledWith('tenant-1');
  });

  it('uses only the authenticated tenant when loading inventory', () => {
    controller.getInventory({ user: { tenantId: 'tenant-1' } });

    expect(service.getInventory).toHaveBeenCalledWith('tenant-1');
  });

  it('uses the authenticated tenant when an administrator creates a product', () => {
    const dto = { sku: 'RNG-001', name: 'Anillo', unitPrice: 100, stockOnHand: 1 };

    controller.createCatalogProduct(dto, { user: { tenantId: 'tenant-1' } });

    expect(service.createCatalogProduct).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('delegates reseller sales list, detail, checkout and cancel to CommerceService with scope', () => {
    const req = { user: { id: 'reseller-1', tenantId: 'tenant-1', role: Role.REVENDEDOR } };

    controller.listSales(req, CommerceSaleStatus.PENDING_PAYMENT, 'ORD-');
    expect(commerceService.listSales).toHaveBeenCalledWith(req.user, {
      channel: SalesChannel.RESELLER_POS,
      status: CommerceSaleStatus.PENDING_PAYMENT,
      q: 'ORD-',
      scopeToReseller: true,
    });

    controller.getSale('sale-1', req);
    expect(commerceService.getSale).toHaveBeenCalledWith(req.user, 'sale-1', true);

    const dto = { items: [{ productId: 'p1', quantity: 1 }] } as any;
    controller.checkout(dto, 'idem-1', req);
    expect(commerceService.checkout).toHaveBeenCalledWith(
      req.user,
      SalesChannel.RESELLER_POS,
      dto,
      'idem-1',
    );

    const cancelDto = { reason: 'Sin existencias físicas' };
    controller.cancelSale('sale-1', cancelDto, req);
    expect(commerceService.cancelSale).toHaveBeenCalledWith(req.user, 'sale-1', cancelDto, true);
  });
});
