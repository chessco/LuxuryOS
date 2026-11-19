import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSaleDto } from './commerce-sale.dto';

describe('CreateSaleDto', () => {
  const fingerprint = 'a'.repeat(64);

  it('trims and accepts an exact SHA-256 quote fingerprint', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      items: [{ productId: 'product-1', quantity: 1 }],
      expectedQuoteFingerprint: ` ${fingerprint} `,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.expectedQuoteFingerprint).toBe(fingerprint);
  });

  it('rejects malformed quote fingerprints before checkout', async () => {
    const dto = plainToInstance(CreateSaleDto, {
      items: [{ productId: 'product-1', quantity: 1 }],
      expectedQuoteFingerprint: 'not-a-sha',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
