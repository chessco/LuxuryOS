import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type GoldKarat = '10K' | '14K' | '18K' | '24K';

interface GoldQuoteConfig {
  enabled: boolean;
  pricingMode: 'MARGIN_PERCENT' | 'MARGIN_FIXED' | 'MANUAL';
  primaryKarat: GoldKarat;
  marginPercent: number;
  marginFixedMxn: number;
  exchangeRateAdjustmentMxn: number;
  manualPricesMxn: Record<GoldKarat, number>;
  fallbackSpotUsdOz: number;
  fallbackUsdMxn: number;
}

export interface PublicGoldQuote {
  enabled: boolean;
  primaryKarat: GoldKarat;
  workshopPricesMxn: Record<GoldKarat, number>;
  source: 'live' | 'cached' | 'fallback';
  fetchedAt: string;
}

const GOLD_CONFIG_KEY = 'gold_quote_config';
const TROY_OUNCE_GRAMS = 31.1034768;
const GOLD_PURITY: Record<GoldKarat, number> = {
  '10K': 10 / 24,
  '14K': 14 / 24,
  '18K': 18 / 24,
  '24K': 1,
};
const DEFAULT_GOLD_CONFIG: GoldQuoteConfig = {
  enabled: true,
  pricingMode: 'MARGIN_PERCENT',
  primaryKarat: '14K',
  marginPercent: 8,
  marginFixedMxn: 85,
  exchangeRateAdjustmentMxn: 1,
  manualPricesMxn: { '10K': 790, '14K': 1105, '18K': 1420, '24K': 1895 },
  fallbackSpotUsdOz: 2650,
  fallbackUsdMxn: 20.2,
};

const readGoldSpot = (value: unknown): number => {
  if (!value || typeof value !== 'object') return Number.NaN;
  return Number((value as Record<string, unknown>).price);
};

const readUsdMxn = (value: unknown): number => {
  if (!value || typeof value !== 'object') return Number.NaN;
  const rates = (value as Record<string, unknown>).rates;
  if (!rates || typeof rates !== 'object') return Number.NaN;
  return Number((rates as Record<string, unknown>).MXN);
};

@Injectable()
export class SettingsService {
  private readonly publicGoldCache = new Map<string, { expiresAt: number; quote: PublicGoldQuote }>();

  constructor(private prisma: PrismaService) {}

  private parseGoldConfig(raw: string): GoldQuoteConfig {
    try {
      const parsed = JSON.parse(raw || '{}') as Partial<GoldQuoteConfig>;
      const pricingMode = ['MARGIN_PERCENT', 'MARGIN_FIXED', 'MANUAL'].includes(String(parsed.pricingMode))
        ? parsed.pricingMode as GoldQuoteConfig['pricingMode']
        : DEFAULT_GOLD_CONFIG.pricingMode;
      const primaryKarat = ['10K', '14K', '18K', '24K'].includes(String(parsed.primaryKarat))
        ? parsed.primaryKarat as GoldKarat
        : DEFAULT_GOLD_CONFIG.primaryKarat;
      return {
        enabled: parsed.enabled !== false,
        pricingMode,
        primaryKarat,
        marginPercent: Number.isFinite(Number(parsed.marginPercent)) ? Number(parsed.marginPercent) : DEFAULT_GOLD_CONFIG.marginPercent,
        marginFixedMxn: Number.isFinite(Number(parsed.marginFixedMxn)) ? Number(parsed.marginFixedMxn) : DEFAULT_GOLD_CONFIG.marginFixedMxn,
        exchangeRateAdjustmentMxn: Number.isFinite(Number(parsed.exchangeRateAdjustmentMxn))
          ? Math.max(0, Number(parsed.exchangeRateAdjustmentMxn))
          : DEFAULT_GOLD_CONFIG.exchangeRateAdjustmentMxn,
        manualPricesMxn: Object.fromEntries(
          Object.keys(GOLD_PURITY).map((karat) => {
            const key = karat as GoldKarat;
            const value = Number(parsed.manualPricesMxn?.[key]);
            return [key, value > 0 ? value : DEFAULT_GOLD_CONFIG.manualPricesMxn[key]];
          }),
        ) as Record<GoldKarat, number>,
        fallbackSpotUsdOz: Number(parsed.fallbackSpotUsdOz) > 0 ? Number(parsed.fallbackSpotUsdOz) : DEFAULT_GOLD_CONFIG.fallbackSpotUsdOz,
        fallbackUsdMxn: Number(parsed.fallbackUsdMxn) > 0 ? Number(parsed.fallbackUsdMxn) : DEFAULT_GOLD_CONFIG.fallbackUsdMxn,
      };
    } catch {
      return DEFAULT_GOLD_CONFIG;
    }
  }

  private async fetchNumber(url: string, read: (value: unknown) => number): Promise<number | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const value = read(await response.json() as unknown);
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async getPublicGoldQuote(tenantId: string): Promise<PublicGoldQuote> {
    const cached = this.publicGoldCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.quote;

    const config = this.parseGoldConfig(await this.getSetting(tenantId, GOLD_CONFIG_KEY, '{}'));
    if (!config.enabled) {
      return {
        enabled: false,
        primaryKarat: config.primaryKarat,
        workshopPricesMxn: config.manualPricesMxn,
        source: 'fallback',
        fetchedAt: new Date().toISOString(),
      };
    }

    const [spotResult, fxResult] = await Promise.all([
      this.fetchNumber('https://api.gold-api.com/price/XAU', readGoldSpot),
      this.fetchNumber('https://open.er-api.com/v6/latest/USD', readUsdMxn),
    ]);
    const spotUsdOz = spotResult && spotResult >= 500 && spotResult <= 20_000
      ? spotResult
      : config.fallbackSpotUsdOz;
    const usdMxn = fxResult && fxResult >= 5 && fxResult <= 100
      ? fxResult
      : config.fallbackUsdMxn;
    const source: PublicGoldQuote['source'] = spotResult === spotUsdOz && fxResult === usdMxn ? 'live' : 'fallback';
    const adjustedUsdMxn = Math.max(0.01, usdMxn - config.exchangeRateAdjustmentMxn);
    const market24k = (spotUsdOz * adjustedUsdMxn) / TROY_OUNCE_GRAMS;
    const workshopPricesMxn = Object.fromEntries(
      Object.entries(GOLD_PURITY).map(([karat, purity]) => {
        const key = karat as GoldKarat;
        const marketPrice = market24k * purity;
        const price = config.pricingMode === 'MANUAL'
          ? config.manualPricesMxn[key]
          : config.pricingMode === 'MARGIN_PERCENT'
            ? marketPrice * (1 - Math.min(100, Math.max(0, config.marginPercent)) / 100)
            : Math.max(0, marketPrice - Math.max(0, config.marginFixedMxn) * purity);
        return [key, Number(price.toFixed(2))];
      }),
    ) as Record<GoldKarat, number>;
    const quote: PublicGoldQuote = {
      enabled: config.enabled,
      primaryKarat: config.primaryKarat,
      workshopPricesMxn,
      source,
      fetchedAt: new Date().toISOString(),
    };
    this.publicGoldCache.set(tenantId, { expiresAt: Date.now() + 5 * 60_000, quote });
    return quote;
  }

  async getSettings(tenantId: string) {
    const settings = await this.prisma.setting.findMany({
      where: { tenantId },
    });
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async upsertSetting(tenantId: string, key: string, value: string) {
    if (key === GOLD_CONFIG_KEY) this.publicGoldCache.delete(tenantId);
    return this.prisma.setting.upsert({
      where: {
        tenantId_key: { tenantId, key },
      },
      update: { value },
      create: { tenantId, key, value },
    });
  }

  async getSetting(tenantId: string, key: string, defaultValue?: string): Promise<string> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });
    return setting?.value || defaultValue || '';
  }

  async clearDemoData(tenantId: string) {
    void tenantId;
    throw new ForbiddenException(
      'La limpieza destructiva está deshabilitada. Las órdenes sólo admiten borrado lógico con auditoría.',
    );
  }
}
