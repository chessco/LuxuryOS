import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoldQuoteAdminControls } from '../components/widgets/GoldQuoteWidget';
import {
    computeMarketKaratPrices,
    computeWorkshopKaratPrices,
    fetchLiveGoldMarket,
    formatMxn,
    GoldMarketSnapshot,
    GoldQuoteConfig,
    KARAT_LIST,
    loadGoldConfigFromServer,
    readCachedMarket,
    readLocalGoldConfig,
    saveGoldConfigToServer,
} from '../components/widgets/goldQuoteUtils';

const WidgetsSettings: React.FC = () => {
    const [config, setConfig] = useState<GoldQuoteConfig>(() => readLocalGoldConfig());
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
    const [refreshing, setRefreshing] = useState(false);
    const [toggling, setToggling] = useState(false);

    const refreshMarket = useCallback(async (cfg: GoldQuoteConfig) => {
        setRefreshing(true);
        try {
            const snap = await fetchLiveGoldMarket(cfg);
            setMarket(snap);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const serverCfg = await loadGoldConfigFromServer();
            const activeCfg = serverCfg || readLocalGoldConfig();
            if (mounted && serverCfg) {
                setConfig(serverCfg);
            }
            if (mounted) {
                await refreshMarket(activeCfg);
            }
        };
        init();
        return () => {
            mounted = false;
        };
    }, [refreshMarket]);

    const marketPrices = useMemo(
        () => computeMarketKaratPrices(market.spotUsdOz, market.usdMxn),
        [market.spotUsdOz, market.usdMxn],
    );

    const workshopPrices = useMemo(
        () => computeWorkshopKaratPrices(marketPrices, config),
        [marketPrices, config],
    );

    const handleQuickToggle = async () => {
        setToggling(true);
        try {
            const saved = await saveGoldConfigToServer({
                ...config,
                enabled: !config.enabled,
            });
            setConfig(saved);
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden max-w-5xl mx-auto w-full p-4 md:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        to="/settings"
                        className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-foreground text-2xl sm:text-3xl font-black tracking-tight font-display">
                            Widgets del Tablero
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium">
                            Controla qué widgets están visibles en iPad / iPhone y configura sus reglas oficiales para el equipo.
                        </p>
                    </div>
                </div>
                <Link
                    to="/orders?type=REPAIR"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-black uppercase tracking-wider text-foreground transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    <span>Ver en Tablero</span>
                </Link>
            </header>

            <div className="flex-1 overflow-y-auto space-y-6 pb-10 custom-scrollbar">
                {/* Tarjeta del Widget #1: Cotización del Oro */}
                <section className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
                        <div className="flex items-start gap-3.5">
                            <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[26px]">monetization_on</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-black text-foreground">
                                        Cotización del Oro &amp; Calculadora de Taller
                                    </h2>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            config.enabled
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-zinc-500/15 text-muted-foreground'
                                        }`}
                                    >
                                        {config.enabled ? 'Visible en tablero' : 'Oculto'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                                    Administradores ven cotización Spot, tipo de cambio y margen. Vendedores únicamente ven la tarifa
                                    oficial de taller y pueden abrir la calculadora en gramos sin acceso a costos base ni márgenes.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleQuickToggle}
                            disabled={toggling}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                config.enabled
                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                    : 'bg-muted text-foreground border-border hover:bg-muted/80'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {config.enabled ? 'toggle_on' : 'toggle_off'}
                            </span>
                            <span>{toggling ? 'Actualizando...' : config.enabled ? 'Activo' : 'Desactivado'}</span>
                        </button>
                    </div>

                    {/* Vista previa en vivo */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Vista previa vigente ({market.source === 'live' ? 'Spot en vivo' : 'Respaldo / Caché'})
                            </span>
                            <button
                                type="button"
                                onClick={() => refreshMarket(config)}
                                disabled={refreshing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-colors cursor-pointer"
                            >
                                <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
                                    refresh
                                </span>
                                <span>Actualizar Spot</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                            <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 col-span-1 sm:col-span-2">
                                <span className="text-[10px] font-black uppercase text-muted-foreground block">Spot XAU / Oz · USD/MXN</span>
                                <span className="text-sm font-black text-foreground tabular-nums mt-0.5 block">
                                    US${market.spotUsdOz.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · $
                                    {market.usdMxn.toFixed(2)}
                                </span>
                            </div>
                            {KARAT_LIST.map(({ karat }) => (
                                <div key={karat} className="rounded-2xl bg-muted/40 border border-border/60 p-3">
                                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">
                                        {karat} Taller
                                    </span>
                                    <span className="text-sm font-black text-foreground tabular-nums block">
                                        {formatMxn(workshopPrices[karat], 0)}/g
                                    </span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums block">
                                        Mkt {formatMxn(marketPrices[karat], 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formulario compartido de parámetros */}
                    <GoldQuoteAdminControls
                        config={config}
                        marketPrices={marketPrices}
                        showVisibilityToggle
                        showSettingsLink={false}
                        onSaved={(saved) => setConfig(saved)}
                    />
                </section>

                {/* Espacio preparado para próximos widgets */}
                <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 p-5 flex items-center gap-4">
                    <div className="size-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <span className="material-symbols-outlined text-[22px]">add_circle_outline</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                            Catálogo extensible de Widgets
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Los próximos widgets que agregues al carrusel del tablero (tipo de cambio, metas del día o alertas de taller) aparecerán aquí para activarlos y configurar sus parámetros.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetsSettings;
