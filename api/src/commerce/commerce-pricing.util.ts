import { createHash } from 'crypto';

export const toCents = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Precio inválido');
  return Math.round((amount + Number.EPSILON) * 100);
};

export function evaluateResellerPrice(publicPrice: unknown, resellerPrice: unknown) {
  const publicCents = toCents(publicPrice);
  const resellerCents = toCents(resellerPrice ?? publicPrice);
  const marginCents = Math.max(0, publicCents - resellerCents);
  return {
    publicCents,
    resellerCents,
    marginCents,
    publicUnitPrice: publicCents / 100,
    unitPrice: resellerCents / 100,
    commissionUnitAmount: marginCents / 100,
  };
}

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
    const price = evaluateResellerPrice(product.unitPrice, product.resellerPrice);
    return {
      productId: item.productId,
      quantity: item.quantity,
      currency: product.currency,
      publicUnitPrice: price.publicUnitPrice,
      unitPrice: price.unitPrice,
      commissionUnitAmount: price.commissionUnitAmount,
      commissionAmount: (price.marginCents * item.quantity) / 100,
      publicLineTotal: (price.publicCents * item.quantity) / 100,
      lineTotal: (price.resellerCents * item.quantity) / 100,
    };
  });
  const canonical = lines
    .map((line) => `${line.productId}:${line.quantity}:${line.currency}:${toCents(line.publicUnitPrice)}:${toCents(line.unitPrice)}`)
    .sort()
    .join('|');
  return { lines, quoteFingerprint: createHash('sha256').update(canonical).digest('hex') };
}
