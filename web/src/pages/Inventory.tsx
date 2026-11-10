import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    CreateInventoryArticleInput,
    InventoryArticle,
    InventoryAvailabilityStatus,
    InventoryResponse,
    InventoryService,
} from '../services/inventory.service';

const labels: Record<InventoryAvailabilityStatus, string> = {
    AVAILABLE: 'Disponible', LOW_STOCK: 'Stock bajo', RESERVED: 'Reservado', OUT_OF_STOCK: 'Agotado',
};

const emptyArticle: CreateInventoryArticleInput = {
    sku: '', name: '', description: '', category: '', imageUrl: '', unitPrice: 0,
    currency: 'MXN', stockOnHand: 1, availableToResellers: true,
};

const money = (value: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency, maximumFractionDigits: 2,
}).format(value);

const errorText = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || 'No se pudo completar la operación.';
};

const statusClass = (status: InventoryAvailabilityStatus) => ({
    AVAILABLE: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    LOW_STOCK: 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10',
    RESERVED: 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10',
    OUT_OF_STOCK: 'text-muted-foreground border-border bg-muted/50',
}[status]);

const InventoryPage = () => {
    const [data, setData] = useState<InventoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'ALL' | InventoryAvailabilityStatus>('ALL');
    const [category, setCategory] = useState('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await InventoryService.list());
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void reload(); }, [reload]);

    const categories = useMemo(() => Array.from(new Set(
        (data?.items || []).map((item) => item.category).filter((value): value is string => Boolean(value)),
    )).sort((a, b) => a.localeCompare(b, 'es-MX')), [data]);

    const rows = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('es-MX');
        return (data?.items || []).filter((item) => {
            if (status !== 'ALL' && item.availabilityStatus !== status) return false;
            if (category !== 'ALL' && item.category !== category) return false;
            return !normalized || [item.sku, item.name, item.category].filter(Boolean)
                .some((value) => value!.toLocaleLowerCase('es-MX').includes(normalized));
        });
    }, [category, data, query, status]);

    const commercialValue = useMemo(() => (data?.items || [])
        .reduce((total, item) => total + item.unitPrice * item.stockOnHand, 0), [data]);

    return (
        <div className="flex-1 flex flex-col items-center max-w-[1400px] mx-auto w-full">
            <div className="w-full flex flex-col gap-8">
                <header className="flex flex-col lg:flex-row flex-wrap justify-between gap-6 items-start lg:items-end">
                    <div className="flex flex-col gap-3 max-w-2xl">
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Operación Cared</p>
                        <h1 className="text-foreground text-4xl font-black tracking-tight font-display">Inventario</h1>
                        <p className="text-muted-foreground text-sm font-medium">Administra los artículos y existencias que Cared habilita para Revendedores.</p>
                    </div>
                    <button type="button" onClick={() => setIsCreateOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-foreground text-background h-12 px-8 text-xs font-black uppercase tracking-[0.2em] shadow-xl active:scale-95">
                        <span className="material-symbols-outlined text-[20px]">add</span> Nuevo Artículo
                    </button>
                </header>

                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumen de inventario">
                    <Summary label="Valor comercial" value={money(commercialValue)} />
                    <Summary label="Artículos" value={String(data?.summary.productCount || 0)} />
                    <Summary label="Stock bajo" value={String(data?.summary.lowStockCount || 0)} alert={(data?.summary.lowStockCount || 0) > 0} />
                    <Summary label="Piezas disponibles" value={String(data?.summary.availableQuantity || 0)} />
                </section>

                <section className="bg-card rounded-2xl p-5 lg:p-6 border border-border flex flex-col gap-5 shadow-sm" aria-label="Filtros de inventario">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_200px_220px_auto] gap-3">
                        <label className="relative flex items-center h-12 rounded-xl bg-muted/50 border border-border overflow-hidden focus-within:border-primary">
                            <span className="grid place-items-center h-full w-12 text-muted-foreground material-symbols-outlined">search</span>
                            <input className="h-full w-full outline-none text-sm text-foreground bg-transparent pr-3 placeholder-muted-foreground" placeholder="Buscar por nombre, SKU o categoría..." value={query} onChange={(event) => setQuery(event.target.value)} />
                        </label>
                        <label className="sr-only" htmlFor="status-filter">Estado</label>
                        <select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | InventoryAvailabilityStatus)} className="h-12 rounded-xl bg-muted/50 border border-border px-4 text-foreground text-sm outline-none focus:border-primary">
                            <option value="ALL">Todos los estados</option>
                            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <label className="sr-only" htmlFor="category-filter">Categoría</label>
                        <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-xl bg-muted/50 border border-border px-4 text-foreground text-sm outline-none focus:border-primary">
                            <option value="ALL">Todas las categorías</option>
                            {categories.map((entry) => <option key={entry}>{entry}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setQuery(''); setStatus('ALL'); setCategory('ALL'); }} className="h-12 px-4 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 text-[10px] font-black uppercase tracking-widest">Limpiar</button>
                            <button type="button" onClick={() => void reload()} disabled={loading} aria-label="Actualizar inventario" className="size-12 grid place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"><span className="material-symbols-outlined">refresh</span></button>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-[11px] font-medium">Las altas se registran en Cared; los movimientos y reservas siguen auditados por LuxuryOS.</p>
                </section>

                {error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500" role="alert">{error}</p>}
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Listado de artículos">
                    <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left border-collapse">
                        <thead><tr className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                            <th className="px-7 py-5">Artículo</th><th className="px-6 py-5">Categoría</th><th className="px-6 py-5 text-center">Físico</th><th className="px-6 py-5 text-center">Reservado</th><th className="px-6 py-5 text-center">Disponible</th><th className="px-6 py-5 text-right">Precio</th><th className="px-7 py-5 text-right">Estado</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                            {loading ? <tr><td colSpan={7} className="px-7 py-14 text-center text-sm text-muted-foreground">Cargando inventario…</td></tr>
                                : rows.length === 0 ? <tr><td colSpan={7} className="px-7 py-14 text-center text-sm text-muted-foreground">No hay artículos que coincidan con los filtros.</td></tr>
                                    : rows.map((item) => <Row key={item.id} item={item} />)}
                        </tbody>
                    </table></div>
                    <footer className="px-7 py-5 border-t border-border bg-muted/30 flex items-center justify-between gap-4"><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Mostrando {rows.length} de {data?.summary.productCount || 0} artículos</p><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Inventario compartido</p></footer>
                </section>
            </div>
            {isCreateOpen && <CreateArticleModal onClose={() => setIsCreateOpen(false)} onCreated={async () => { setIsCreateOpen(false); await reload(); }} />}
        </div>
    );
};

const Summary = ({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) => <article className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2"><p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{label}</p><div className="flex items-center gap-3"><strong className="text-foreground text-2xl font-black tracking-tighter">{value}</strong>{alert && <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border text-red-500 bg-red-500/10 border-red-500/20">Atención</span>}</div></article>;

const Row = ({ item }: { item: InventoryArticle }) => <tr className="group hover:bg-muted/30 transition-colors"><td className="px-7 py-5"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[22px] text-muted-foreground">diamond</span>}</div><div><strong className="block font-bold text-foreground text-sm leading-tight uppercase">{item.name}</strong><span className="block mt-1 text-muted-foreground text-[10px] font-black uppercase tracking-widest">SKU: {item.sku}</span></div></div></td><td className="px-6 py-5 text-xs font-medium text-muted-foreground">{item.category || 'Sin categoría'}</td><td className="px-6 py-5 text-center font-black text-foreground">{item.stockOnHand}</td><td className="px-6 py-5 text-center font-black text-muted-foreground">{item.reservedQuantity}</td><td className="px-6 py-5 text-center font-black text-foreground">{item.availableQuantity}</td><td className="px-6 py-5 text-right font-bold text-foreground">{money(item.unitPrice, item.currency)}</td><td className="px-7 py-5 text-right"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${statusClass(item.availabilityStatus)}`}>{labels[item.availabilityStatus]}</span></td></tr>;

const CreateArticleModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) => {
    const [form, setForm] = useState(emptyArticle);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = <Key extends keyof CreateInventoryArticleInput>(key: Key, value: CreateInventoryArticleInput[Key]) => setForm((current) => ({ ...current, [key]: value }));
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSubmitting(true); setError(null);
        try {
            await InventoryService.create({ ...form, sku: form.sku.trim(), name: form.name.trim(), category: form.category?.trim(), description: form.description?.trim(), imageUrl: form.imageUrl?.trim() });
            await onCreated();
        } catch (requestError) { setError(errorText(requestError)); } finally { setSubmitting(false); }
    };
    const inputClass = 'w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:outline-none transition-all placeholder-muted-foreground';
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="article-modal-title"><div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl"><header className="px-7 py-6 border-b border-border flex items-center justify-between bg-muted/20"><div><p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Inventario Cared</p><h2 id="article-modal-title" className="mt-2 text-foreground text-xl font-black uppercase tracking-widest">Nuevo artículo</h2></div><button type="button" onClick={onClose} className="size-9 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></header><form className="p-7 space-y-6" onSubmit={submit}><p className="text-sm text-muted-foreground">El artículo se crea en Cared y queda habilitado para Revendedores. Precio y existencias son la fuente de verdad para el POS.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><Field label="SKU" required><input required value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Ej. RNG-DIA-001" className={inputClass} /></Field><Field label="Nombre" required><input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Anillo diamante solitario" className={inputClass} /></Field><Field label="Categoría"><input value={form.category} onChange={(e) => set('category', e.target.value)} list="inventory-categories" placeholder="Ej. Joyería" className={inputClass} /><datalist id="inventory-categories"><option value="Joyería" /><option value="Relojería" /><option value="Gemas" /><option value="Accesorios" /></datalist></Field><Field label="URL de imagen"><input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" className={inputClass} /></Field></div><Field label="Descripción"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Metal, piedra, medidas u otros detalles" className={`${inputClass} min-h-24 resize-y`} /></Field><div className="grid grid-cols-1 sm:grid-cols-3 gap-5"><Field label="Existencia física" required><input required min="0" step="1" type="number" value={form.stockOnHand} onChange={(e) => set('stockOnHand', Number(e.target.value))} className={inputClass} /></Field><Field label="Precio de venta" required><input required min="0" step="0.01" type="number" value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} className={inputClass} /></Field><Field label="Moneda"><select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputClass}><option value="MXN">MXN</option><option value="USD">USD</option></select></Field></div>{error && <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500" role="alert">{error}</p>}<footer className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-3"><button type="button" onClick={onClose} disabled={submitting} className="px-6 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest">Cancelar</button><button type="submit" disabled={submitting} className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold uppercase tracking-widest shadow-lg disabled:opacity-50">{submitting ? 'Guardando…' : 'Guardar artículo'}</button></footer></form></div></div>;
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => <label className="block space-y-2"><span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>;

export default InventoryPage;
