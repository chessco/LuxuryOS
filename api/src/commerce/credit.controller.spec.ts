import { CreditFacilityType, CreditObligationStatus, CreditSubjectType, Role } from '@prisma/client';
import { CreditController } from './credit.controller';

describe('CreditController', () => {
  const credit = {
    listAccounts: jest.fn(),
    upsertAccount: jest.fn(),
    getSubjectSummary: jest.fn(),
    listObligations: jest.fn(),
    getObligation: jest.fn(),
    recordObligationPayment: jest.fn(),
  };

  let controller: CreditController;
  const adminReq = { user: { id: 'admin-1', tenantId: 'tenant-1', role: Role.TENANT_ADMIN } };
  const sellerReq = { user: { id: 'seller-1', tenantId: 'tenant-1', role: Role.VENDEDOR } };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new CreditController(credit as any);
  });

  it('delegates listAccounts converting onlyOverdue query string to boolean', () => {
    controller.listAccounts(sellerReq, CreditSubjectType.RESELLER, 'carlos', 'true');
    expect(credit.listAccounts).toHaveBeenCalledWith(sellerReq.user, {
      subjectType: CreditSubjectType.RESELLER,
      q: 'carlos',
      onlyOverdue: true,
    });
  });

  it('delegates upsertAccount for admin limit configuration', () => {
    const dto = {
      subjectType: CreditSubjectType.CLIENT,
      clientId: 'client-1',
      revolvingLimit: 50000,
      defaultTermDays: 30,
    };
    controller.upsertAccount(adminReq, dto as any);
    expect(credit.upsertAccount).toHaveBeenCalledWith(adminReq.user, dto);
  });

  it('delegates getSubjectSummary with resellerId or clientId', () => {
    controller.getSubjectSummary(sellerReq, 'reseller-1', undefined);
    expect(credit.getSubjectSummary).toHaveBeenCalledWith(sellerReq.user, {
      resellerId: 'reseller-1',
      clientId: undefined,
    });
  });

  it('delegates listObligations and getObligation with tenant actor', () => {
    controller.listObligations(
      sellerReq,
      CreditFacilityType.NON_REVOLVING,
      CreditObligationStatus.OVERDUE,
      CreditSubjectType.RESELLER,
      'ORD-123',
    );
    expect(credit.listObligations).toHaveBeenCalledWith(sellerReq.user, {
      facilityType: CreditFacilityType.NON_REVOLVING,
      status: CreditObligationStatus.OVERDUE,
      subjectType: CreditSubjectType.RESELLER,
      q: 'ORD-123',
    });

    controller.getObligation(sellerReq, 'obli-1');
    expect(credit.getObligation).toHaveBeenCalledWith(sellerReq.user, 'obli-1');
  });

  it('delegates recordPayment forwarding the Idempotency-Key header', () => {
    const body = { amount: 3000, method: 'Efectivo', reference: 'CAJA-01' };
    controller.recordPayment(sellerReq, 'obli-1', body as any, 'idem-pay-99');
    expect(credit.recordObligationPayment).toHaveBeenCalledWith(
      sellerReq.user,
      'obli-1',
      body,
      'idem-pay-99',
    );
  });
});
