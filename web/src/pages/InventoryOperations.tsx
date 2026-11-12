import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type Supplier = { id: string; name: string };
type Product = { id: string; sku: string; name: string; unitPrice: number };
type Line = { productId: string; quantity: number; unitCost: number };

export default function InventoryOperations() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [type, setType] = useState<'INITIAL_STOCK' | 'ENTRY'>('INITIAL_STOCK');
  const [currency, setCurrency] = useState('MXN');
  const [comments, setComments] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitCost: 0 }]);
  const [message, setMessage] = useState('');
  const load = async () => {
    const [supplierResponse, productResponse] = await Promise.all([api.get<Supplier[]>('/inventory-operations/suppliers'), api.get<Product[]>('/commerce/catalog')]);
    setSuppliers(supplierResponse.data); setProducts(productResponse.data);
  };
  useEffect(() => { load().catch(() => setMessage('No fue posible cargar proveedores o artículos.')); }, []);
  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0), [lines]);
  const update = (index: number, field: keyof Line, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [field]: field === 'productId' ? value : Number(value) } : line));
  const addSupplier = async () => { const response = await api.post<Supplier>('/inventory-operations/suppliers', { name: supplierName }); setSuppliers(current => [...current, response.data]); setSupplierId(response.data.id); setSupplierName(''); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setMessage(''); try { await api.post('/inventory-operations/entries', { supplierId, type, currency, comments, items: lines }); setMessage('Entrada registrada. Las existencias fueron actualizadas.'); setLines([{ productId: '', quantity: 1, unitCost: 0 }]); setComments(''); } catch (error: any) { setMessage(error?.response?.data?.message || 'No fue posible registrar la entrada.'); } };
  return <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
    <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-red-500">Inventario</p><h1 className="text-3xl font-black text-foreground">Operaciones de Inventario</h1><p className="text-sm text-muted-foreground">Orden de entrada maestro–detalle. Las existencias se actualizan al confirmar.</p></div></div>
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-4"><label className="text-xs font-bold">Tipo<select value={type} onChange={e => setType(e.target.value as any)} className="mt-2 w-full rounded-lg border border-border bg-background p-3"><option value="INITIAL_STOCK">Inventario inicial</option><option value="ENTRY">Entrada</option></select></label><label className="text-xs font-bold">Proveedor<select required value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-3"><option value="">Seleccionar...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-bold">Moneda<select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-3"><option>MXN</option><option>USD</option></select></label><label className="text-xs font-bold">Nuevo proveedor<div className="mt-2 flex gap-2"><input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="min-w-0 w-full rounded-lg border border-border bg-background p-3" placeholder="Nombre"/><button type="button" onClick={addSupplier} disabled={!supplierName.trim()} className="rounded-lg bg-foreground px-3 text-background">+</button></div></label></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Artículo</th><th className="p-3">Cantidad</th><th className="p-3">Costo unitario</th><th className="p-3 text-right">Total</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={index} className="border-b border-border"><td className="p-3"><select required value={line.productId} onChange={e => update(index, 'productId', e.target.value)} className="w-full rounded-lg border border-border bg-background p-2"><option value="">Seleccionar artículo...</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></td><td className="p-3"><input min="1" type="number" value={line.quantity} onChange={e => update(index, 'quantity', e.target.value)} className="w-24 rounded-lg border border-border bg-background p-2"/></td><td className="p-3"><input min="0" step="0.01" type="number" value={line.unitCost} onChange={e => update(index, 'unitCost', e.target.value)} className="w-32 rounded-lg border border-border bg-background p-2"/></td><td className="p-3 text-right font-bold">{(line.quantity * line.unitCost).toLocaleString('es-MX', { style: 'currency', currency })}</td><td><button type="button" onClick={() => setLines(current => current.filter((_, i) => i !== index))} disabled={lines.length === 1} className="text-red-500">×</button></td></tr>)}</tbody></table></div>
      <div className="flex justify-between"><button type="button" onClick={() => setLines(current => [...current, { productId: '', quantity: 1, unitCost: 0 }])} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">+ Artículo</button><p className="text-lg font-black">Costo total: {total.toLocaleString('es-MX', { style: 'currency', currency })}</p></div>
      <label className="block text-xs font-bold">Comentarios<textarea value={comments} onChange={e => setComments(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-3" rows={3}/></label>
      {message && <p className="rounded-lg border border-border p-3 text-sm">{message}</p>}<div className="flex justify-end"><button className="rounded-xl bg-foreground px-6 py-3 text-xs font-black uppercase tracking-widest text-background">Confirmar entrada</button></div>
    </form></div>;
}
