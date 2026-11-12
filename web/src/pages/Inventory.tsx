import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

type CatalogProduct = {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    unitPrice: number | string;
    currency: string;
    stockOnHand: number;
    reservedQuantity: number;
};

const money = (value: number | string, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(value || 0));

const InventoryPage: React.FC = () => {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadInventory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<CatalogProduct[]>('/commerce/catalog');
            setProducts(response.data);
        } catch (requestError: any) {
            setError(requestError?.response?.data?.message || 'No fue posible cargar el inventario. Intenta actualizar de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadInventory(); }, []);

    const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean) as string[])].sort(), [products]);
    const rows = useMemo(() => products.filter((product) => {
        const text = `${product.sku} ${product.name} ${product.category || ''}`.toLowerCase();
        return text.includes(query.trim().toLowerCase()) && (!category || product.category === category);
    }), [category, products, query]);
    const summary = useMemo(() => products.reduce((totals, product) => {
        const available = Math.max(0, Number(product.stockOnHand) - Number(product.reservedQuantity));
        totals.stock += Number(product.stockOnHand);
        totals.reserved += Number(product.reservedQuantity);
        totals.available += available;
        totals.value += Number(product.unitPrice || 0) * Number(product.stockOnHand);
        if (available > 0 && available <= 1) totals.lowStock += 1;
        return totals;
    }, { stock: 0, reserved: 0, available: 0, value: 0, lowStock: 0 }), [products]);

    return <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
        <div className="w-full flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
                <div className="flex flex-col gap-3 max-w-2xl">
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Inventario</p>
                    <h1 className="text-foreground text-4xl font-black tracking-tight font-display">Inventario</h1>
                    <p className="text-muted-foreground text-sm font-medium">Existencias y precios sincronizados desde el catálogo real. Las cantidades se calculan por movimientos.</p>
                </div>
                <Link to="/inventory/operations" className="flex items-center justify-center gap-2 rounded-xl bg-foreground text-background transition-all h-12 px-8 text-xs font-black uppercase tracking-[0.2em] shadow-xl active:scale-95">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span><span>Nueva entrada</span>
                </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryStat label="Valor de catálogo" value={money(summary.value)} />
                <SummaryStat label="Artículos" value={String(products.length)} />
                <SummaryStat label="Existencia" value={String(summary.stock)} />
                <SummaryStat label="Reservadas" value={String(summary.reserved)} />
                <SummaryStat label="Disponibles" value={String(summary.available)} badge={summary.lowStock ? `${summary.lowStock} bajo` : undefined} />
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border flex flex-col lg:flex-row justify-between gap-4 shadow-sm">
                <label className="relative flex items-center w-full lg:max-w-md h-12 rounded-xl bg-muted/50 border border-border overflow-hidden focus-within:border-red-500 transition-all">
                    <span className="grid place-items-center h-full w-12 text-muted-foreground material-symbols-outlined" aria-hidden="true">search</span>
                    <span className="sr-only">Buscar inventario</span>
                    <input className="h-full w-full outline-none text-sm text-foreground bg-transparent pr-2 placeholder-muted-foreground" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, SKU o categoría..." type="search" />
                </label>
                <div className="flex items-center gap-3">
                    <label className="sr-only" htmlFor="inventory-category">Categoría</label>
                    <select id="inventory-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-xl bg-muted/50 border border-border px-4 text-xs font-bold uppercase tracking-widest text-foreground focus:border-red-500 focus:outline-none">
                        <option value="">Todas las categorías</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <button type="button" onClick={() => void loadInventory()} disabled={loading} className="h-12 rounded-xl border border-border bg-card px-5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-red-500 disabled:opacity-50 transition-all" aria-label="Actualizar inventario">{loading ? 'Cargando…' : 'Actualizar'}</button>
                </div>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-500">{error}</div>}

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-5 font-bold">Artículo</th><th className="px-5 py-5 font-bold">Categoría</th><th className="px-5 py-5 font-bold text-center">Existencia</th><th className="px-5 py-5 font-bold text-center">Reservadas</th><th className="px-5 py-5 font-bold text-center">Disponible</th><th className="px-8 py-5 font-bold text-right">Precio 1</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {loading && <tr><td colSpan={6} className="px-8 py-16 text-center text-sm text-muted-foreground">Cargando inventario…</td></tr>}
                        {!loading && !error && rows.map((product) => {
                            const available = Math.max(0, Number(product.stockOnHand) - Number(product.reservedQuantity));
                            return <tr key={product.id} className="group hover:bg-muted/30 transition-colors">
                                <td className="px-8 py-6"><div className="flex items-center gap-5"><div className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[24px] text-muted-foreground" aria-hidden="true">diamond</span></div><div><h2 className="font-bold text-foreground text-base leading-tight uppercase tracking-tighter">{product.name}</h2><div className="flex items-center gap-3 mt-1.5"><span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">SKU: {product.sku}</span>{product.description && <><span className="w-1 h-1 rounded-full bg-border" /><span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{product.description}</span></>}</div></div></div></td>
                                <td className="px-5 py-6 text-xs font-medium text-muted-foreground">{product.category || 'Sin categoría'}</td>
                                <td className="px-5 py-6 text-center font-black text-foreground">{product.stockOnHand}</td>
                                <td className="px-5 py-6 text-center font-black text-muted-foreground">{product.reservedQuantity}</td>
                                <td className="px-5 py-6 text-center"><span className="font-black text-foreground">{available}</span>{available > 0 && available <= 1 && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" title="Stock bajo" />}</td>
                                <td className="px-8 py-6 text-right"><p className="font-bold text-foreground text-base">{money(product.unitPrice, product.currency)}</p><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{product.currency}</p></td>
                            </tr>;
                        })}
                        {!loading && !error && rows.length === 0 && <tr><td colSpan={6} className="px-8 py-16 text-center"><p className="font-bold text-foreground">No hay artículos que coincidan.</p><p className="mt-2 text-sm text-muted-foreground">Modifica los filtros o registra una entrada cuando el artículo ya exista en el catálogo.</p></td></tr>}
                    </tbody>
                </table>
                <div className="px-8 py-5 border-t border-border bg-muted/30"><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest" aria-live="polite">Mostrando {rows.length} de {products.length} artículos</p></div>
            </div>
        </div>
    </div>;
};

const SummaryStat: React.FC<{ label: string; value: string; badge?: string }> = ({ label, value, badge }) => <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2"><p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{label}</p><div className="flex items-center gap-3"><p className="text-foreground text-2xl font-black tracking-tighter">{value}</p>{badge && <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border text-red-500 bg-red-500/10 border-red-500/20">{badge}</span>}</div></div>;

export default InventoryPage;
