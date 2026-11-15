import { SettingsService } from './settings.service';

describe('SettingsService public gold quote', () => {
  const prisma: any = {
    setting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const service = new SettingsService(prisma);
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.setting.findUnique.mockResolvedValue({
      value: JSON.stringify({
        enabled: true,
        pricingMode: 'MARGIN_PERCENT',
        primaryKarat: '14K',
        marginPercent: 10,
        fallbackSpotUsdOz: 2500,
        fallbackUsdMxn: 20,
      }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns final workshop prices without exposing private margins', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: 3000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { MXN: 20 } }) }) as any;

    const result = await service.getPublicGoldQuote('tenant-gold-live');

    expect(result.enabled).toBe(true);
    expect(result.primaryKarat).toBe('14K');
    expect(result.source).toBe('live');
    expect(result.workshopPricesMxn['24K']).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('marginPercent');
    expect(result).not.toHaveProperty('marginFixedMxn');
    expect(result).not.toHaveProperty('pricingMode');
  });

  it('rejects implausible provider values and uses configured fallbacks', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: 999999999 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { MXN: 0.01 } }) }) as any;

    const result = await service.getPublicGoldQuote('tenant-gold-fallback');

    expect(result.source).toBe('fallback');
    expect(result.workshopPricesMxn['24K']).toBeCloseTo(((2500 * 20) / 31.1034768) * 1.1, 2);
  });

  it('invalidates the public cache when the private configuration changes', async () => {
    global.fetch = jest.fn()
      .mockResolvedValue({ ok: true, json: async () => ({ price: 3000, rates: { MXN: 20 } }) }) as any;
    prisma.setting.upsert.mockResolvedValue({ key: 'gold_quote_config' });

    await service.getPublicGoldQuote('tenant-gold-cache');
    await service.upsertSetting('tenant-gold-cache', 'gold_quote_config', '{}');
    await service.getPublicGoldQuote('tenant-gold-cache');

    expect(prisma.setting.findUnique).toHaveBeenCalledTimes(2);
  });
});
