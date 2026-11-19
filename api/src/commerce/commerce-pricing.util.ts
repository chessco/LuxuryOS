import { createHash } from 'crypto';

export const toCents = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Precio inválido');
  return Math.round((amount + Number.EPSILON) * 100);
};

export type PricedLine = {
  productId: string;
  quantity: number;
  currency: string;
  publicUnitPrice: number;
  unitPrice: number;
  commissionUnitAmount: number;
  commissionAmount: number;
  publicLineTotal: number;
  lineTotal: number;
};

export function priceResellerLines(
  items: { productId: string; quantity: number }[],
  products: { id: string; currency: string; unitPrice: unknown; resellerPrice: unknown }[],
): { lines: PricedLine[]; quoteFingerprint: string } {
  const byId = new Map(products.map((product) => [product.id, product]));
  const currencies = new Set(products.map((product) => product.currency));
  if (currencies.size !== 1 || products.length !== items.length) throw new Error('Carrito inválido');
  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new Error('Artículo no disponible');
    const publicCents = toCents(product.unitPrice);
    const resellerCents = toCents(product.resellerPrice ?? product.unitPrice);
    const marginCents = Math.max(0, publicCents - resellerCents);
    return {
      productId: item.productId,
      quantity: item.quantity,
      currency: product.currency,
      publicUnitPrice: publicCents / 100,
      unitPrice: resellerCents / 100,
      commissionUnitAmount: marginCents / 100,
      commissionAmount: (marginCents * item.quantity) / 100,
      publicLineTotal: (publicCents * item.quantity) / 100,
      lineTotal: (resellerCents * item.quantity) / 100,
    };
  });
  const canonical = lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    currency: line.currency,
    publicUnitPriceCents: toCents(line.publicUnitPrice),
    resellerUnitPriceCents: toCents(line.unitPrice),
  })).sort((a, b) => a.productId.localeCompare(b.productId));
  return { lines, quoteFingerprint: createHash('sha256').update(JSON.stringify(canonical)).digest('hex') };
}
