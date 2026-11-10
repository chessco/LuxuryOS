import { ResellerPosController } from './reseller-pos.controller';

describe('ResellerPosController', () => {
  const service = {
    getProfile: jest.fn(),
    getCatalog: jest.fn(),
    createCatalogProduct: jest.fn(),
  };
  const controller = new ResellerPosController(service as any);

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

  it('uses the authenticated tenant when an administrator creates a product', () => {
    const dto = { sku: 'RNG-001', name: 'Anillo', unitPrice: 100, stockOnHand: 1 };

    controller.createCatalogProduct(dto, { user: { tenantId: 'tenant-1' } });

    expect(service.createCatalogProduct).toHaveBeenCalledWith('tenant-1', dto);
  });
});
