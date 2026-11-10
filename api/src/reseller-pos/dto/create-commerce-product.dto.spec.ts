import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCommerceProductDto } from './create-commerce-product.dto';

const validProduct = {
  sku: 'RNG-001',
  name: 'Anillo',
  unitPrice: '1250.50',
  currency: 'MXN',
  stockOnHand: '2',
  availableToResellers: true,
};

describe('CreateCommerceProductDto', () => {
  it('accepts a valid product and transforms numeric payload values', async () => {
    const dto = plainToInstance(CreateCommerceProductDto, validProduct);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.unitPrice).toBe(1250.5);
    expect(dto.stockOnHand).toBe(2);
  });

  it('rejects invalid currency, fractional stock, negative price and an empty SKU', async () => {
    const dto = plainToInstance(CreateCommerceProductDto, {
      ...validProduct,
      sku: '',
      currency: 'PESO',
      unitPrice: '-0.01',
      stockOnHand: '1.5',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['sku', 'currency', 'unitPrice', 'stockOnHand']),
    );
  });
});
