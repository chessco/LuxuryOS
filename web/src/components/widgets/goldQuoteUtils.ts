import api from '../../services/api';

export type GoldKarat = '10K' | '14K' | '18K' | '24K';
export type GoldPricingMode = 'MARGIN_PERCENT' | 'MARGIN_FIXED' | 'MANUAL';

export interface GoldQuoteConfig {
    enabled: boolean;
    pricingMode: GoldPricingMode;
    primaryKarat: GoldKarat;
    marginPercent: number;
    marginFixedMxn: number;
    exchangeRateAdjustmentMxn: number;
    manualPricesMxn: Record<GoldKarat, number>;
    fallbackSpotUsdOz: number;
    fallbackUsdMxn: number;
    updatedAt?: string;
    updatedBy?: string;
}

export interface GoldMarketSnapshot {
    spotUsdOz: number;
    usdMxn: number;
    previousMxn24k?: number;
    changePercent?: number;
    source: 'live' | 'cached' | 'fallback';
    fetchedAt: string;
}

export const TROY_OUNCE_GRAMS = 31.1034768;
export const GOLD_CONFIG_SETTING_KEY = 'gold_quote_config';
export const MARKET_CACHE_KEY = 'gold_quote_market_cache';
export const GOLD_CONFIG_EVENT = 'gold-quote-config-updated';

export const KARAT_LIST: { karat: GoldKarat; label: string; purity: number; fineness: string }[] = [
    { karat: '10K', label: '10K', purity: 10 / 24, fineness: '.417' },
    { karat: '14K', label: '14K', purity: 14 / 24, fineness: '.583' },
    { karat: '18K', label: '18K', purity: 18 / 24, fineness: '.750' },
    { karat: '24K', label: '24K', purity: 1, fineness: '.999' },
];

export const DEFAULT_GOLD_CONFIG: GoldQuoteConfig = {
    enabled: true,
    pricingMode: 'MARGIN_PERCENT',
    primaryKarat: '14K',
    marginPercent: 8,
    marginFixedMxn: 85,
    exchangeRateAdjustmentMxn: 1,
    manualPricesMxn: {
        '10K': 790,
        '14K': 1105,
        '18K': 1420,
        '24K': 1895,
    },
    fallbackSpotUsdOz: 2650,
    fallbackUsdMxn: 20.2,
};

/** Calcula el precio de mercado por gramo en MXN para cada quilataje a partir de Spot USD/oz y USD/MXN. */
export function computeMarketKaratPrices(spotUsdOz: number, usdMxn: number): Record<GoldKarat, number> {
    const safeSpot = Number.isFinite(spotUsdOz) && spotUsdOz > 0 ? spotUsdOz : DEFAULT_GOLD_CONFIG.fallbackSpotUsdOz;
    const safeFx = Number.isFinite(usdMxn) && usdMxn > 0 ? usdMxn : DEFAULT_GOLD_CONFIG.fallbackUsdMxn;
    const mxn24kPerGram = (safeSpot * safeFx) / TROY_OUNCE_GRAMS;

    return KARAT_LIST.reduce((acc, item) => {
        acc[item.karat] = Number((mxn24kPerGram * item.purity).toFixed(2));
        return acc;
    }, {} as Record<GoldKarat, number>);
}

/** Tipo de cambio conservador usado para calcular ofertas de compra de oro. */
export function computePurchaseExchangeRate(usdMxn: number, adjustmentMxn: number): number {
    const safeFx = Number.isFinite(usdMxn) && usdMxn > 0 ? usdMxn : DEFAULT_GOLD_CONFIG.fallbackUsdMxn;
    const safeAdjustment = Number.isFinite(adjustmentMxn)
        ? Math.max(0, adjustmentMxn)
        : DEFAULT_GOLD_CONFIG.exchangeRateAdjustmentMxn;
    return Number(Math.max(0.01, safeFx - safeAdjustment).toFixed(4));
}

/** Calcula el precio oficial del taller por gramo en MXN según el modo configurado por Administración. */
export function computeWorkshopKaratPrices(
    marketPrices: Record<GoldKarat, number>,
    config: GoldQuoteConfig,
): Record<GoldKarat, number> {
    if (config.pricingMode === 'MANUAL') {
        return {
            '10K': Number(config.manualPricesMxn['10K'] || marketPrices['10K']),
            '14K': Number(config.manualPricesMxn['14K'] || marketPrices['14K']),
            '18K': Number(config.manualPricesMxn['18K'] || marketPrices['18K']),
            '24K': Number(config.manualPricesMxn['24K'] || marketPrices['24K']),
        };
    }

    return KARAT_LIST.reduce((acc, { karat, purity }) => {
        const base = marketPrices[karat] || 0;
        if (config.pricingMode === 'MARGIN_PERCENT') {
            const pct = Math.min(100, Math.max(0, Number(config.marginPercent) || 0));
            acc[karat] = Number((base * (1 - pct / 100)).toFixed(2));
        } else {
            const fixedDiscount = Math.max(0, Number(config.marginFixedMxn) || 0) * purity;
            acc[karat] = Number(Math.max(0, base - fixedDiscount).toFixed(2));
        }
        return acc;
    }, {} as Record<GoldKarat, number>);
}

/** Calcula proporcionalmente 10K, 14K y 18K desde un precio base 24K. */
export function deriveManualKaratsFrom24K(price24k: number): Record<GoldKarat, number> {
    const safe24 = Number.isFinite(price24k) && price24k > 0 ? price24k : 0;
    return {
        '10K': Number((safe24 * (10 / 24)).toFixed(2)),
        '14K': Number((safe24 * (14 / 24)).toFixed(2)),
        '18K': Number((safe24 * (18 / 24)).toFixed(2)),
        '24K': Number(safe24.toFixed(2)),
    };
}

export function parseGoldConfig(raw: unknown): GoldQuoteConfig {
    if (!raw) return DEFAULT_GOLD_CONFIG;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== 'object') return DEFAULT_GOLD_CONFIG;
        const p = parsed as Partial<GoldQuoteConfig>;
        const pricingMode: GoldPricingMode =
            p.pricingMode === 'MARGIN_FIXED' || p.pricingMode === 'MANUAL' || p.pricingMode === 'MARGIN_PERCENT'
                ? p.pricingMode
                : DEFAULT_GOLD_CONFIG.pricingMode;
        const primaryKarat: GoldKarat =
            p.primaryKarat === '10K' || p.primaryKarat === '14K' || p.primaryKarat === '18K' || p.primaryKarat === '24K'
                ? p.primaryKarat
                : DEFAULT_GOLD_CONFIG.primaryKarat;
        return {
            enabled: p.enabled !== false,
            pricingMode,
            primaryKarat,
            marginPercent: Number.isFinite(Number(p.marginPercent)) ? Number(p.marginPercent) : DEFAULT_GOLD_CONFIG.marginPercent,
            marginFixedMxn: Number.isFinite(Number(p.marginFixedMxn)) ? Number(p.marginFixedMxn) : DEFAULT_GOLD_CONFIG.marginFixedMxn,
            exchangeRateAdjustmentMxn: Number.isFinite(Number(p.exchangeRateAdjustmentMxn))
                ? Math.max(0, Number(p.exchangeRateAdjustmentMxn))
                : DEFAULT_GOLD_CONFIG.exchangeRateAdjustmentMxn,
            manualPricesMxn: {
                '10K': Number(p.manualPricesMxn?.['10K']) || DEFAULT_GOLD_CONFIG.manualPricesMxn['10K'],
                '14K': Number(p.manualPricesMxn?.['14K']) || DEFAULT_GOLD_CONFIG.manualPricesMxn['14K'],
                '18K': Number(p.manualPricesMxn?.['18K']) || DEFAULT_GOLD_CONFIG.manualPricesMxn['18K'],
                '24K': Number(p.manualPricesMxn?.['24K']) || DEFAULT_GOLD_CONFIG.manualPricesMxn['24K'],
            },
            fallbackSpotUsdOz: Number(p.fallbackSpotUsdOz) > 0 ? Number(p.fallbackSpotUsdOz) : DEFAULT_GOLD_CONFIG.fallbackSpotUsdOz,
            fallbackUsdMxn: Number(p.fallbackUsdMxn) > 0 ? Number(p.fallbackUsdMxn) : DEFAULT_GOLD_CONFIG.fallbackUsdMxn,
            updatedAt: p.updatedAt,
            updatedBy: p.updatedBy,
        };
    } catch {
        return DEFAULT_GOLD_CONFIG;
    }
}

export function readLocalGoldConfig(): GoldQuoteConfig {
    try {
        return parseGoldConfig(localStorage.getItem(GOLD_CONFIG_SETTING_KEY));
    } catch {
        return DEFAULT_GOLD_CONFIG;
    }
}

let inFlightConfigPromise: Promise<GoldQuoteConfig | null> | null = null;
let lastServerConfig: GoldQuoteConfig | null = null;
let lastServerConfigAt = 0;
let lastServerAudience: 'admin' | 'public' | null = null;
const CONFIG_MEMORY_TTL_MS = 15_000;

export function saveLocalGoldConfig(config: GoldQuoteConfig): void {
    lastServerConfig = config;
    lastServerConfigAt = Date.now();
    try {
        localStorage.setItem(GOLD_CONFIG_SETTING_KEY, JSON.stringify(config));
    } catch {
        // ignore storage quota errors
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<GoldQuoteConfig>(GOLD_CONFIG_EVENT, { detail: config }));
    }
}

export async function loadGoldConfigFromServer(force = false): Promise<GoldQuoteConfig | null> {
    const audience = isUserAdmin() ? 'admin' : 'public';
    if (lastServerAudience !== audience) {
        lastServerConfig = null;
        lastServerConfigAt = 0;
        inFlightConfigPromise = null;
    }
    if (!force && lastServerConfig && Date.now() - lastServerConfigAt < CONFIG_MEMORY_TTL_MS) {
        return lastServerConfig;
    }
    if (inFlightConfigPromise) {
        return inFlightConfigPromise;
    }

    inFlightConfigPromise = (async () => {
        try {
            if (audience === 'public') {
                const { data } = await api.get('/settings/gold-quote');
                const parsed = parseGoldConfig({
                    enabled: data?.enabled !== false,
                    pricingMode: 'MANUAL',
                    primaryKarat: data?.primaryKarat,
                    manualPricesMxn: data?.workshopPricesMxn,
                    marginPercent: 0,
                    marginFixedMxn: 0,
                });
                lastServerAudience = audience;
                saveLocalGoldConfig(parsed);
                return parsed;
            }
            const { data } = await api.get('/settings');
            if (data?.[GOLD_CONFIG_SETTING_KEY]) {
                const parsed = parseGoldConfig(data[GOLD_CONFIG_SETTING_KEY]);
                lastServerAudience = audience;
                saveLocalGoldConfig(parsed);
                return parsed;
            }
        } catch {
            // Transient network fallback handled by caller
        } finally {
            inFlightConfigPromise = null;
        }
        return null;
    })();

    return inFlightConfigPromise;
}

export async function saveGoldConfigToServer(draft: GoldQuoteConfig): Promise<GoldQuoteConfig> {
    const nextConfig: GoldQuoteConfig = {
        ...draft,
        updatedAt: new Date().toISOString(),
        updatedBy: getCurrentUserLabel(),
    };
    await api.post('/settings', {
        [GOLD_CONFIG_SETTING_KEY]: JSON.stringify(nextConfig),
    });
    lastServerAudience = 'admin';
    // Publicar localmente sólo después de que el servidor confirme la fuente oficial.
    saveLocalGoldConfig(nextConfig);
    return nextConfig;
}

export function readCachedMarket(): GoldMarketSnapshot | null {
    try {
        const raw = localStorage.getItem(MARKET_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GoldMarketSnapshot;
        if (parsed?.spotUsdOz > 0 && parsed?.usdMxn > 0) {
            return { ...parsed, source: 'cached' };
        }
        return null;
    } catch {
        return null;
    }
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<any> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        window.clearTimeout(timer);
    }
}

/** Obtiene Spot intradía XAU/USD + USD/MXN en tiempo real y compara contra el cierre de referencia. */
export async function fetchLiveGoldMarket(config: GoldQuoteConfig): Promise<GoldMarketSnapshot> {
    const prevCache = readCachedMarket();
    const cachedPrev24k = prevCache ? (prevCache.spotUsdOz * prevCache.usdMxn) / TROY_OUNCE_GRAMS : undefined;

    const saveSnapshot = (snapshot: GoldMarketSnapshot) => {
        try {
            localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(snapshot));
        } catch {
            // ignore storage quota errors
        }
        return snapshot;
    };

    const [goldApiRes, fxRes, refRes] = await Promise.allSettled([
        fetchJsonWithTimeout('https://api.gold-api.com/price/XAU', 4000),
        fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD', 4000),
        fetchJsonWithTimeout('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json', 4000).catch(
            () => fetchJsonWithTimeout('https://latest.currency-api.pages.dev/v1/currencies/xau.json', 4000),
        ),
    ]);

    const liveSpotUsd = goldApiRes.status === 'fulfilled' ? Number(goldApiRes.value?.price) : 0;
    const liveUsdMxn = fxRes.status === 'fulfilled' ? Number(fxRes.value?.rates?.MXN) : 0;
    const refMxnOz = refRes.status === 'fulfilled' ? Number(refRes.value?.xau?.mxn) : 0;
    const refUsdOz = refRes.status === 'fulfilled' ? Number(refRes.value?.xau?.usd) : 0;
    const ref24k = refMxnOz > 0 ? refMxnOz / TROY_OUNCE_GRAMS : undefined;

    if (liveSpotUsd > 0 && (liveUsdMxn > 0 || (refMxnOz > 0 && refUsdOz > 0))) {
        const usdMxn = liveUsdMxn > 0 ? liveUsdMxn : refMxnOz / refUsdOz;
        const current24k = (liveSpotUsd * usdMxn) / TROY_OUNCE_GRAMS;
        const baseline24k = ref24k || cachedPrev24k;
        const changePercent =
            baseline24k && baseline24k > 0
                ? Number((((current24k - baseline24k) / baseline24k) * 100).toFixed(2))
                : undefined;

        return saveSnapshot({
            spotUsdOz: Number(liveSpotUsd.toFixed(2)),
            usdMxn: Number(usdMxn.toFixed(4)),
            previousMxn24k: baseline24k,
            changePercent,
            source: 'live',
            fetchedAt: new Date().toISOString(),
        });
    }

    if (refMxnOz > 0 && refUsdOz > 0) {
        const current24k = refMxnOz / TROY_OUNCE_GRAMS;
        const usdMxn = liveUsdMxn > 0 ? liveUsdMxn : refMxnOz / refUsdOz;
        let changePercent: number | undefined;
        let prev24k = cachedPrev24k;

        try {
            const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
            const prevData = await fetchJsonWithTimeout(
                `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yesterday}/v1/currencies/xau.json`,
                2500,
            );
            const prevMxnPerOz = Number(prevData?.xau?.mxn);
            if (prevMxnPerOz > 0) {
                prev24k = prevMxnPerOz / TROY_OUNCE_GRAMS;
                changePercent = Number((((current24k - prev24k) / prev24k) * 100).toFixed(2));
            }
        } catch {
            if (cachedPrev24k && cachedPrev24k > 0) {
                const diff = ((current24k - cachedPrev24k) / cachedPrev24k) * 100;
                if (Math.abs(diff) >= 0.01) {
                    changePercent = Number(diff.toFixed(2));
                }
            }
        }

        return saveSnapshot({
            spotUsdOz: Number(refUsdOz.toFixed(2)),
            usdMxn: Number(usdMxn.toFixed(4)),
            previousMxn24k: prev24k,
            changePercent,
            source: 'live',
            fetchedAt: new Date().toISOString(),
        });
    }

    if (liveUsdMxn > 0) {
        return {
            spotUsdOz: prevCache?.spotUsdOz || config.fallbackSpotUsdOz,
            usdMxn: Number(liveUsdMxn.toFixed(4)),
            source: 'cached',
            fetchedAt: new Date().toISOString(),
        };
    }

    if (prevCache) return prevCache;

    return {
        spotUsdOz: config.fallbackSpotUsdOz,
        usdMxn: config.fallbackUsdMxn,
        source: 'fallback',
        fetchedAt: new Date().toISOString(),
    };
}

export function formatMxn(value: number, decimals = 0): string {
    return value.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function isUserAdmin(): boolean {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const role = String(user?.role || '').toUpperCase();
        const email = String(user?.email || '').toLowerCase();
        return (
            role === 'SYSTEM_ADMIN' ||
            role === 'TENANT_ADMIN' ||
            role === 'ADMIN' ||
            role === 'SUPER_ADMIN' ||
            email.includes('system')
        );
    } catch {
        return false;
    }
}

export function getCurrentUserLabel(): string {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.name || user?.email || 'Admin';
    } catch {
        return 'Admin';
    }
}

export function getModeBadgeLabel(config: GoldQuoteConfig): string {
    if (config.pricingMode === 'MANUAL') return 'Compra fija';
    if (config.pricingMode === 'MARGIN_PERCENT') return `Spot -${config.marginPercent}%`;
    return `Spot -$${config.marginFixedMxn}`;
}
