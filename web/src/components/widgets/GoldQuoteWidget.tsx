import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
    computeMarketKaratPrices,
    computeWorkshopKaratPrices,
    deriveManualKaratsFrom24K,
    fetchLiveGoldMarket,
    formatMxn,
    getModeBadgeLabel,
    GOLD_CONFIG_EVENT,
    GoldKarat,
    GoldMarketSnapshot,
    GoldPricingMode,
    GoldQuoteConfig,
    isUserAdmin,
    KARAT_LIST,
    loadGoldConfigFromServer,
    readCachedMarket,
    readLocalGoldConfig,
    saveGoldConfigToServer,
} from './goldQuoteUtils';

export interface GoldQuoteAdminControlsProps {
    config: GoldQuoteConfig;
    marketPrices: Record<GoldKarat, number>;
    onSaved: (nextConfig: GoldQuoteConfig) => void;
    showVisibilityToggle?: boolean;
    showSettingsLink?: boolean;
    compact?: boolean;
}

/** Formulario compartido de administración para controlar visibilidad y precios oficiales del taller. */
export const GoldQuoteAdminControls: React.FC<GoldQuoteAdminControlsProps> = ({
    config,
    marketPrices,
    onSaved,
    showVisibilityToggle = true,
    showSettingsLink = true,
    compact = false,
}) => {
    const [draftConfig, setDraftConfig] = useState<GoldQuoteConfig>(config);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    useEffect(() => {
        setDraftConfig(config);
    }, [config]);

    const draftWorkshopPrices = useMemo(
        () => computeWorkshopKaratPrices(marketPrices, draftConfig),
        [marketPrices, draftConfig],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage(null);
        try {
            const saved = await saveGoldConfigToServer(draftConfig);
            onSaved(saved);
            setSaveMessage({ type: 'ok', text: 'Parámetros sincronizados en todo el taller.' });
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'No se pudo guardar la configuración en el servidor.';
            setSaveMessage({ type: 'err', text: String(msg) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={`rounded-2xl border border-indigo-500/25 bg-indigo-500/5 ${compact ? 'p-3.5 sm:p-4 space-y-3.5' : 'p-5 sm:p-6 space-y-4'}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                        Control Administrador · Precio Oficial de Taller
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                        Define si el taller cotiza sobre el precio en vivo (+margen) o con tarifa fija manual.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {showSettingsLink && (
                        <Link
                            to="/settings/widgets"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background border border-border text-[11px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">widgets</span>
                            <span>Ajustes</span>
                        </Link>
                    )}
                    <select
                        value={draftConfig.primaryKarat}
                        onChange={(e) =>
                            setDraftConfig((prev) => ({ ...prev, primaryKarat: e.target.value as GoldKarat }))
                        }
                        className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                        title="Quilataje visible por defecto en la tarjeta"
                    >
                        {KARAT_LIST.map((k) => (
                            <option key={k.karat} value={k.karat}>
                                Default: {k.karat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {showVisibilityToggle && (
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 cursor-pointer">
                    <div>
                        <span className="block text-xs font-bold text-foreground">Widget visible en el tablero</span>
                        <span className="block text-[10px] text-muted-foreground">
                            Activa o desactiva la tarjeta de cotización y calculadora rápida para el equipo.
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={draftConfig.enabled}
                        onChange={(e) =>
                            setDraftConfig((prev) => ({
                                ...prev,
                                enabled: e.target.checked,
                            }))
                        }
                        className="size-4 accent-amber-500 cursor-pointer"
                    />
                </label>
            )}

            {/* Selector de 3 modos */}
            <div className="grid grid-cols-3 gap-1.5 bg-background/70 p-1 rounded-xl border border-border">
                {[
                    { id: 'MARGIN_PERCENT' as GoldPricingMode, label: 'Spot + % Margen' },
                    { id: 'MARGIN_FIXED' as GoldPricingMode, label: 'Spot + $ Fijo' },
                    { id: 'MANUAL' as GoldPricingMode, label: 'Manual Fijo' },
                ].map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDraftConfig((prev) => ({ ...prev, pricingMode: mode.id }))}
                        className={`py-2 px-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                            draftConfig.pricingMode === mode.id
                                ? 'bg-foreground text-background shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>

            {draftConfig.pricingMode === 'MARGIN_PERCENT' && (
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-bold text-foreground">Porcentaje sobre Mercado (%):</label>
                    <input
                        type="number"
                        step="0.5"
                        value={draftConfig.marginPercent}
                        onChange={(e) =>
                            setDraftConfig((prev) => ({
                                ...prev,
                                marginPercent: Number(e.target.value),
                            }))
                        }
                        className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm font-black text-foreground outline-none focus:border-indigo-500 tabular-nums"
                    />
                    <span className="text-[11px] text-muted-foreground">
                        Vista previa 14K:{' '}
                        <strong className="text-foreground">{formatMxn(draftWorkshopPrices['14K'], 2)}/g</strong>
                    </span>
                </div>
            )}

            {draftConfig.pricingMode === 'MARGIN_FIXED' && (
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-bold text-foreground">Margen base 24K (+MXN/g):</label>
                    <input
                        type="number"
                        step="5"
                        value={draftConfig.marginFixedMxn}
                        onChange={(e) =>
                            setDraftConfig((prev) => ({
                                ...prev,
                                marginFixedMxn: Number(e.target.value),
                            }))
                        }
                        className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm font-black text-foreground outline-none focus:border-indigo-500 tabular-nums"
                    />
                    <span className="text-[11px] text-muted-foreground">
                        Proporcional por quilataje · 14K:{' '}
                        <strong className="text-foreground">{formatMxn(draftWorkshopPrices['14K'], 2)}/g</strong>
                    </span>
                </div>
            )}

            {draftConfig.pricingMode === 'MANUAL' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground">
                            Precios manuales de taller (MXN por gramo):
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setDraftConfig((prev) => ({
                                    ...prev,
                                    manualPricesMxn: deriveManualKaratsFrom24K(prev.manualPricesMxn['24K']),
                                }))
                            }
                            className="text-[11px] font-black text-indigo-500 hover:text-indigo-400 cursor-pointer"
                        >
                            Calcular 10K/14K/18K desde 24K
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {KARAT_LIST.map(({ karat }) => (
                            <div key={karat} className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-muted-foreground">
                                    {karat} (MXN/g)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={draftConfig.manualPricesMxn[karat]}
                                    onChange={(e) =>
                                        setDraftConfig((prev) => ({
                                            ...prev,
                                            manualPricesMxn: {
                                                ...prev.manualPricesMxn,
                                                [karat]: Number(e.target.value),
                                            },
                                        }))
                                    }
                                    className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-sm font-black text-foreground outline-none focus:border-indigo-500 tabular-nums"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-[11px]">
                    {saveMessage && (
                        <span
                            className={`font-bold ${
                                saveMessage.type === 'ok'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            {saveMessage.text}
                        </span>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                    {saving ? 'Guardando...' : 'Guardar en Taller'}
                </button>
            </div>

            <details className="pt-1 text-[11px] text-muted-foreground">
                <summary className="cursor-pointer font-bold hover:text-foreground select-none">
                    Valores de respaldo sin conexión (Spot / USD-MXN)
                </summary>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                        <label className="text-[10px] font-bold uppercase block mb-1">Spot USD/oz respaldo</label>
                        <input
                            type="number"
                            min="100"
                            step="1"
                            value={draftConfig.fallbackSpotUsdOz}
                            onChange={(e) =>
                                setDraftConfig((prev) => ({
                                    ...prev,
                                    fallbackSpotUsdOz: Number(e.target.value),
                                }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground tabular-nums"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase block mb-1">USD/MXN respaldo</label>
                        <input
                            type="number"
                            min="1"
                            step="0.05"
                            value={draftConfig.fallbackUsdMxn}
                            onChange={(e) =>
                                setDraftConfig((prev) => ({
                                    ...prev,
                                    fallbackUsdMxn: Number(e.target.value),
                                }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground tabular-nums"
                        />
                    </div>
                </div>
            </details>
        </form>
    );
};

export const GoldQuoteWidget: React.FC = () => {
    const isAdmin = useMemo(() => isUserAdmin(), []);

    const [config, setConfig] = useState<GoldQuoteConfig>(() => readLocalGoldConfig());
    const [selectedKarat, setSelectedKarat] = useState<GoldKarat>(config.primaryKarat);
    const [market, setMarket] = useState<GoldMarketSnapshot>(() => {
        return (
            readCachedMarket() || {
                spotUsdOz: config.fallbackSpotUsdOz,
                usdMxn: config.fallbackUsdMxn,
                source: 'fallback',
                fetchedAt: new Date().toISOString(),
            }
        );
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [calcGrams, setCalcGrams] = useState<string>('5');

    const refreshMarket = useCallback(async (cfg: GoldQuoteConfig) => {
        setIsRefreshing(true);
        try {
            const next = await fetchLiveGoldMarket(cfg);
            setMarket(next);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const serverCfg = await loadGoldConfigFromServer();
            const activeCfg = serverCfg || readLocalGoldConfig();
            if (mounted && serverCfg) {
                setConfig(serverCfg);
                setSelectedKarat(serverCfg.primaryKarat);
            }
            if (mounted && activeCfg.enabled && isAdmin) {
                await refreshMarket(activeCfg);
            }
        };
        init();

        const handleConfigEvent = (ev: Event) => {
            const detail = (ev as CustomEvent<GoldQuoteConfig>).detail;
            if (detail) {
                setConfig(detail);
                setSelectedKarat(detail.primaryKarat);
            }
        };
        window.addEventListener(GOLD_CONFIG_EVENT, handleConfigEvent);

        const interval = window.setInterval(() => {
            if (isAdmin) {
                const latestCfg = readLocalGoldConfig();
                if (latestCfg.enabled) refreshMarket(latestCfg);
            } else {
                void loadGoldConfigFromServer(true).then((latestCfg) => {
                    if (latestCfg) {
                        setConfig(latestCfg);
                        setSelectedKarat(latestCfg.primaryKarat);
                    }
                });
            }
        }, 5 * 60 * 1000);

        return () => {
            mounted = false;
            window.removeEventListener(GOLD_CONFIG_EVENT, handleConfigEvent);
            window.clearInterval(interval);
        };
    }, [isAdmin, refreshMarket]);

    const marketPrices = useMemo(
        () => computeMarketKaratPrices(market.spotUsdOz, market.usdMxn),
        [market.spotUsdOz, market.usdMxn],
    );

    const workshopPrices = useMemo(
        () => computeWorkshopKaratPrices(marketPrices, config),
        [marketPrices, config],
    );

    if (!config.enabled) {
        return null;
    }

    const activeWorkshopPrice = workshopPrices[selectedKarat];
    const activeMarketPrice = marketPrices[selectedKarat];

    const gramsNumeric = Math.max(0, Number(calcGrams) || 0);
    const calcMarketTotal = gramsNumeric * activeMarketPrice;
    const calcWorkshopTotal = gramsNumeric * activeWorkshopPrice;

    const modeBadgeLabel = getModeBadgeLabel(config);
    const sourceStatusColor =
        market.source === 'live'
            ? 'bg-emerald-500'
            : market.source === 'cached'
            ? 'bg-amber-500'
            : 'bg-zinc-400';

    const handleSelectKarat = (karat: GoldKarat, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedKarat(karat);
    };

    return (
        <>
            {/* Tarjeta compacta iPhone / iPad-first */}
            <div
                onClick={() => setIsModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsModalOpen(true);
                    }
                }}
                aria-label={isAdmin ? 'Abrir detalle y configuración del oro' : 'Abrir calculadora de oro del taller'}
                className="w-full rounded-2xl border border-amber-500/25 bg-card/95 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all px-3 py-2.5 sm:px-3.5 sm:py-3 cursor-pointer select-none group"
            >
                {/* Fila superior */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[14px]">monetization_on</span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-foreground shrink-0">
                            ORO
                        </span>
                        {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0">
                                <span
                                    className={`size-1.5 rounded-full ${sourceStatusColor} ${market.source === 'live' ? 'animate-pulse' : ''}`}
                                />
                                {modeBadgeLabel}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                Precio Taller
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {isAdmin && typeof market.changePercent === 'number' && Math.abs(market.changePercent) >= 0.01 && (
                            <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-md tabular-nums ${
                                    market.changePercent >= 0
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                            >
                                {market.changePercent >= 0 ? '▲' : '▼'} {Math.abs(market.changePercent).toFixed(2)}%
                            </span>
                        )}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    refreshMarket(config);
                                }}
                                title="Actualizar cotización"
                                className="size-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <span className={`material-symbols-outlined text-[15px] ${isRefreshing ? 'animate-spin' : ''}`}>
                                    refresh
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsModalOpen(true);
                            }}
                            title="Abrir calculadora de oro del taller"
                            aria-label="Abrir calculadora de oro"
                            className="size-6 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[15px]">calculate</span>
                        </button>
                        {isAdmin && (
                            <Link
                                to="/settings/widgets"
                                onClick={(e) => e.stopPropagation()}
                                title="Configurar widget y precios de taller"
                                aria-label="Configurar widget de oro"
                                className="size-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[15px]">tune</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Fila central: Precio Taller destacado (+ Mercado solo para Admin) */}
                <div className="flex items-baseline justify-between gap-2 mb-2">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400">
                            {selectedKarat} Taller
                        </span>
                        <span className="text-lg sm:text-xl font-black tracking-tight text-foreground tabular-nums leading-none">
                            {formatMxn(activeWorkshopPrice, 0)}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">/g</span>
                    </div>

                    {isAdmin && (
                        <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                                Mkt {formatMxn(activeMarketPrice, 0)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Fila inferior: Selector táctil rápido 10K / 14K / 18K / 24K */}
                <div className="grid grid-cols-4 gap-1">
                    {KARAT_LIST.map(({ karat }) => {
                        const isActive = karat === selectedKarat;
                        return (
                            <button
                                key={karat}
                                type="button"
                                onClick={(e) => handleSelectKarat(karat, e)}
                                className={`flex flex-col items-center justify-center rounded-xl py-1 px-1 text-center transition-all cursor-pointer border ${
                                    isActive
                                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 shadow-2xs'
                                        : 'bg-muted/40 border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="text-[9px] font-black uppercase leading-tight">{karat}</span>
                                <span className="text-[10px] font-bold tabular-nums leading-tight">
                                    {formatMxn(workshopPrices[karat], 0)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal / Bottom-sheet táctil en iPhone e iPad */}
            {isModalOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div
                            className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Cabecera fija */}
                            <div className="shrink-0 px-4 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-border/60 space-y-3">
                                <div className="mx-auto h-1.5 w-12 rounded-full bg-border sm:hidden" />

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[22px]">
                                                {isAdmin ? 'monetization_on' : 'calculate'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-base sm:text-lg font-black text-foreground leading-tight">
                                                {isAdmin
                                                    ? 'Cotización del Oro · Taller & Mercado'
                                                    : 'Calculadora de Oro · Precios de Taller'}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {isAdmin
                                                    ? `${
                                                          market.source === 'live'
                                                              ? 'Cotización internacional en vivo'
                                                              : market.source === 'cached'
                                                              ? 'Última cotización en caché'
                                                              : 'Modo respaldo local'
                                                      } · ${new Date(market.fetchedAt).toLocaleTimeString('es-MX', {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })}`
                                                    : 'Tarifa oficial vigente del taller para cotización a clientes'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => refreshMarket(config)}
                                                disabled={isRefreshing}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-colors cursor-pointer"
                                            >
                                                <span
                                                    className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}
                                                >
                                                    refresh
                                                </span>
                                                <span className="hidden sm:inline">Actualizar</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="size-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                            aria-label="Cerrar"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Contenido desplazable */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                                {/* Indicadores Spot & Tipo de Cambio SOLO para Admin */}
                                {isAdmin && (
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        <div className="rounded-2xl bg-muted/40 border border-border/60 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                Spot XAU / Oz
                                            </p>
                                            <p className="text-sm sm:text-base font-black text-foreground tabular-nums mt-0.5">
                                                US$
                                                {market.spotUsdOz.toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-muted/40 border border-border/60 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                USD / MXN
                                            </p>
                                            <p className="text-sm sm:text-base font-black text-foreground tabular-nums mt-0.5">
                                                ${market.usdMxn.toFixed(2)} MXN
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                Regla Taller
                                            </p>
                                            <p className="text-sm sm:text-base font-black text-foreground truncate mt-0.5">
                                                {modeBadgeLabel}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Mini-calculadora rápida */}
                                <div className="rounded-2xl bg-muted/40 border border-border/70 p-3.5 sm:p-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                            Calculadora Rápida ({selectedKarat})
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {KARAT_LIST.map(({ karat }) => (
                                                <button
                                                    key={karat}
                                                    type="button"
                                                    onClick={() => setSelectedKarat(karat)}
                                                    className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                                                        selectedKarat === karat
                                                            ? 'bg-amber-500 text-black'
                                                            : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    {karat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">Gramos:</span>
                                        {['1', '3', '5', '10', '15'].map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setCalcGrams(g)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                                    calcGrams === g
                                                        ? 'bg-foreground text-background'
                                                        : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {g}g
                                            </button>
                                        ))}
                                    </div>

                                    <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5 items-center`}>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={calcGrams}
                                                onChange={(e) => setCalcGrams(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-14 text-sm font-black text-foreground focus:border-amber-500 outline-none tabular-nums"
                                                placeholder="Gramos"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                                                gramos
                                            </span>
                                        </div>
                                        {isAdmin && (
                                            <div className="rounded-xl bg-background border border-border/70 px-3 py-2">
                                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                                                    Costo Mercado
                                                </span>
                                                <span className="text-sm font-black text-foreground tabular-nums">
                                                    {formatMxn(calcMarketTotal, 2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                                            <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                                                {isAdmin ? 'Precio Taller' : `Total Taller (${gramsNumeric}g × ${formatMxn(activeWorkshopPrice, 2)})`}
                                            </span>
                                            <span className="text-base font-black text-amber-700 dark:text-amber-300 tabular-nums">
                                                {formatMxn(calcWorkshopTotal, 2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla por Quilataje (Vendedores solo ven Tarifa Oficial de Taller) */}
                                <div className="rounded-2xl border border-border overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/60 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            <tr>
                                                <th className="py-2.5 px-3">Quilataje</th>
                                                {isAdmin && <th className="py-2.5 px-3 text-right">Mercado (MXN/g)</th>}
                                                <th className="py-2.5 px-3 text-right">
                                                    {isAdmin ? 'Taller (MXN/g)' : 'Tarifa Oficial de Taller (MXN/g)'}
                                                </th>
                                                {isAdmin && <th className="py-2.5 px-3 text-right">Diferencia</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {KARAT_LIST.map(({ karat, fineness }) => {
                                                const mkt = marketPrices[karat];
                                                const wrk = workshopPrices[karat];
                                                const diff = wrk - mkt;
                                                const isSelected = karat === selectedKarat;
                                                return (
                                                    <tr
                                                        key={karat}
                                                        onClick={() => setSelectedKarat(karat)}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-amber-500/10' : 'hover:bg-muted/40'
                                                        }`}
                                                    >
                                                        <td className="py-2.5 px-3 font-black text-foreground">
                                                            {karat}{' '}
                                                            <span className="text-[10px] font-bold text-muted-foreground">({fineness})</span>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="py-2.5 px-3 text-right font-bold text-muted-foreground tabular-nums">
                                                                {formatMxn(mkt, 2)}
                                                            </td>
                                                        )}
                                                        <td className="py-2.5 px-3 text-right font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                                            {formatMxn(wrk, 2)}
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="py-2.5 px-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                {diff >= 0 ? '+' : ''}
                                                                {formatMxn(diff, 0)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Panel Admin dentro del modal */}
                                {isAdmin && (
                                    <GoldQuoteAdminControls
                                        config={config}
                                        marketPrices={marketPrices}
                                        compact
                                        onSaved={(saved) => {
                                            setConfig(saved);
                                            setSelectedKarat(saved.primaryKarat);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default GoldQuoteWidget;
