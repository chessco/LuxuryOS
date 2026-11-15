import React, { useEffect, useRef, useState } from 'react';
import GoldQuoteWidget from './GoldQuoteWidget';
import { GOLD_CONFIG_EVENT, GoldQuoteConfig, loadGoldConfigFromServer, readLocalGoldConfig } from './goldQuoteUtils';

export interface WidgetDefinition {
    id: string;
    title: string;
    isVisible?: () => boolean;
    render: () => React.ReactNode;
}

interface WidgetDockProps {
    extraWidgets?: WidgetDefinition[];
    className?: string;
}

/**
 * Contenedor modular iPad/iPhone-first para widgets operativos.
 * En iPad/Desktop se alinea a la derecha del encabezado del tablero; en iPhone opera como carrusel táctil compacto.
 */
export const WidgetDock: React.FC<WidgetDockProps> = ({ extraWidgets = [], className = '' }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [goldEnabled, setGoldEnabled] = useState<boolean>(() => readLocalGoldConfig().enabled);

    useEffect(() => {
        let mounted = true;
        loadGoldConfigFromServer().then((cfg) => {
            if (mounted && cfg) {
                setGoldEnabled(cfg.enabled);
            }
        });

        const handleConfigEvent = (ev: Event) => {
            const detail = (ev as CustomEvent<GoldQuoteConfig>).detail;
            if (detail) {
                setGoldEnabled(detail.enabled);
            }
        };
        const handleStorage = () => {
            setGoldEnabled(readLocalGoldConfig().enabled);
        };

        window.addEventListener(GOLD_CONFIG_EVENT, handleConfigEvent);
        window.addEventListener('storage', handleStorage);
        return () => {
            mounted = false;
            window.removeEventListener(GOLD_CONFIG_EVENT, handleConfigEvent);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const defaultWidgets: WidgetDefinition[] = [
        {
            id: 'gold-quote',
            title: 'Cotización del Oro',
            isVisible: () => goldEnabled,
            render: () => <GoldQuoteWidget />,
        },
    ];

    const widgets = [...defaultWidgets, ...extraWidgets].filter((w) => (w.isVisible ? w.isVisible() : true));

    if (widgets.length === 0) {
        return null;
    }

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el || el.clientWidth === 0) return;
        const index = Math.round(el.scrollLeft / el.clientWidth);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    const scrollToWidget = (index: number) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
        setActiveIndex(index);
    };

    return (
        <section
            aria-label="Widgets del Atelier"
            className={`w-full md:w-[295px] lg:w-[355px] shrink-0 ${className}`}
        >
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`flex gap-3 ${
                    widgets.length > 1
                        ? 'overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth'
                        : ''
                }`}
            >
                {widgets.map((widget) => (
                    <div
                        key={widget.id}
                        data-widget-id={widget.id}
                        className="w-full shrink-0 snap-start"
                    >
                        {widget.render()}
                    </div>
                ))}
            </div>

            {widgets.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5" aria-label="Selector de widgets">
                    {widgets.map((widget, idx) => (
                        <button
                            key={widget.id}
                            type="button"
                            onClick={() => scrollToWidget(idx)}
                            aria-label={`Ver widget ${widget.title}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                idx === activeIndex
                                    ? 'w-4 bg-amber-500'
                                    : 'w-1.5 bg-border hover:bg-muted-foreground'
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default WidgetDock;
