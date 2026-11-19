import { evaluateResellerPrice, priceResellerLines, toCents } from './commerce-pricing.util';

describe('reseller pricing snapshots', () => {
  const products = [
    { id: 'a', currency: 'MXN', unitPrice: '120.10', resellerPrice: '99.99' },
    { id: 'b', currency: 'MXN', unitPrice: '50.00', resellerPrice: '60.00' },
  ];

  it('uses cents, clamps negative spreads, and keeps the fingerprint independent of cart order', () => {
    const first = priceResellerLines([{ productId: 'a', quantity: 3 }, { productId: 'b', quantity: 1 }], products);
    const reversed = priceResellerLines([{ productId: 'b', quantity: 1 }, { productId: 'a', quantity: 3 }], products);
    expect(first.quoteFingerprint).toBe(reversed.quoteFingerprint);
    expect(first.quoteFingerprint).toBe('a925a727e1d12501904bbfefe848afcf0c6b891c0e84d34157728a1944a56287');
    expect(first.lines[0]).toMatchObject({ unitPrice: 99.99, publicUnitPrice: 120.1, commissionUnitAmount: 20.11, commissionAmount: 60.33, lineTotal: 299.97 });
    expect(first.lines[1]).toMatchObject({ commissionUnitAmount: 0, commissionAmount: 0 });
    expect(toCents(1.005)).toBe(101);
    expect(evaluateResellerPrice('120.10', '99.99')).toMatchObject({ publicUnitPrice: 120.1, unitPrice: 99.99, commissionUnitAmount: 20.11 });
  });

  it('changes fingerprint when price or quantity changes', () => {
    const original = priceResellerLines([{ productId: 'a', quantity: 1 }], products.slice(0, 1));
    const repriced = priceResellerLines([{ productId: 'a', quantity: 1 }], [{ ...products[0], resellerPrice: '100.00' }]);
    const requantified = priceResellerLines([{ productId: 'a', quantity: 2 }], products.slice(0, 1));
    expect(original.quoteFingerprint).not.toBe(repriced.quoteFingerprint);
    expect(original.quoteFingerprint).not.toBe(requantified.quoteFingerprint);
  });
});
