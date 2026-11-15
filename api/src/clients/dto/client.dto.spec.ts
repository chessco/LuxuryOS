import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientType } from '@prisma/client';
import { CreateClientDto, UpdateClientDto } from './client.dto';

describe('client DTO validation', () => {
  it('accepts a valid reseller portal payload', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'ARACELI RUIZ',
      email: 'araceli@cared.mx',
      type: ClientType.RESELLER,
      tags: ['mayoreo'],
      portalAccess: {
        enable: true,
        username: 'araceli.ruiz',
        password: 'Password123',
      },
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects weak credentials, malformed email, and oversized tags', async () => {
    const dto = plainToInstance(CreateClientDto, {
      name: 'RESELLER',
      email: 'not-an-email',
      type: ClientType.RESELLER,
      tags: Array.from({ length: 31 }, (_, index) => `tag-${index}`),
      portalAccess: {
        enable: true,
        username: 'x!',
        password: 'short',
      },
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'tags', 'portalAccess']),
    );
  });

  it('keeps every field optional for partial updates', async () => {
    await expect(validate(plainToInstance(UpdateClientDto, {}))).resolves.toHaveLength(0);
  });
});
