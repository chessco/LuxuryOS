import React, { useEffect, useState } from 'react';
import { ClientsService } from '../services/clients.service';
import { Quote, QuoteStatus, QuotesService } from '../services/quotes.service';

const labels: Record<QuoteStatus, string> = { DRAFT: 'Borrador', SENT: 'Enviada', AUTHORIZED: 'Autorizada', CONVERTED: 'Convertida', CANCELLED: 'Cancelada' };
const types = ['STANDARD', 'REPAIR', 'MANUFACTURE', 'DESIGN', 'LASER', 'LAYAWAY'];
const emptyForm = { clientId: '', pieceType: '', notes: '', totalAmount: 0, laborCost: 0, materialCost: 0, validUntil: '', metal: '', color: '', karats: '', weight: '', size: '', thickness: '', itemCode: '', imageUrl: '' };
const inputClass = 'w-full border p-3 rounded-xl';

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]); const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const load = async () => setQuotes(await QuotesService.list());
  useEffect(() => { load(); ClientsService.getAll().then(setClients); }, []);
  const field = (name: keyof typeof form, value: string | number) => setForm(current => ({ ...current, [name]: value }));
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const { clientId, pieceType, notes, totalAmount, laborCost, materialCost, validUntil, ...specifications } = form;
      await QuotesService.create({ clientId, pieceType, notes, totalAmount: Number(totalAmount), laborCost: Number(laborCost), materialCost: Number(materialCost), validUntil: validUntil || undefined, specifications: Object.fromEntries(Object.entries(specifications).filter(([, value]) => String(value).trim())) });
      setOpen(false); setForm(emptyForm); await load();
    } finally { setBusy(false); }
  };
  const send = async (q: Quote) => { const r = await QuotesService.sendWhatsApp(q.id); if (r.url) window.open(r.url, '_blank'); await load(); };
  const convert = async (q: Quote) => {
    const target = window.prompt(`Tipo de orden: ${types.join(', ')}`, 'REPAIR')?.toUpperCase(); if (!target || !types.includes(target)) return;
    const technical = ['REPAIR', 'MANUFACTURE', 'DESIGN', 'LASER'].includes(target);
    const source = Array.isArray(q.specifications?.items) ? q.specifications?.items[0] || {} : q.specifications || {};
    const size = technical && !source.size ? window.prompt('Medida de la pieza') : source.size;
    const thickness = technical && !source.thickness ? window.prompt('Grosor de la pieza') : source.thickness;
    if (technical && (!size || !thickness)) return;
    const r = await QuotesService.convert(q.id, target, technical ? { size, thickness } : undefined);
    window.location.href = `/orders/${r.orderId}`;
  };
  return <div className="p-4 sm:p-8 max-w-[1500px] mx-auto">
    <div className="flex justify-between items-center mb-6"><div><h1 className="text-3xl font-black">Cotizaciones</h1><p className="text-zinc-500">Documentos comerciales fuera del flujo operativo.</p></div><button onClick={() => setOpen(true)} className="bg-black text-white rounded-xl px-5 py-3 font-bold">Nueva cotización</button></div>
    <div className="overflow-x-auto bg-white rounded-2xl border"><table className="w-full text-left"><thead><tr className="border-b bg-zinc-50">{['Cotización', 'Fecha', 'Cliente', 'Descripción', 'Total', 'Vigencia', 'Estado', 'Acciones'].map(x => <th key={x} className="p-4 text-xs uppercase">{x}</th>)}</tr></thead><tbody>{quotes.map(q => <tr key={q.id} className="border-b"><td className="p-4 font-bold">{q.quoteCode}</td><td className="p-4">{new Date(q.createdAt).toLocaleDateString('es-MX')}</td><td className="p-4">{q.client.name}</td><td className="p-4">{q.pieceType}</td><td className="p-4">{Number(q.totalAmount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td><td className="p-4">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('es-MX') : '—'}</td><td className="p-4"><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">{labels[q.status]}</span></td><td className="p-4 space-x-2">{['DRAFT', 'SENT'].includes(q.status) && <button onClick={() => send(q)} className="text-green-700 font-bold">WhatsApp</button>}{q.status === 'AUTHORIZED' && <button onClick={() => convert(q)} className="text-red-600 font-bold">Convertir</button>}</td></tr>)}</tbody></table></div>
    {open && <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50"><form onSubmit={create} className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto space-y-4"><div><h2 className="text-2xl font-black">Nueva cotización</h2><p className="text-sm text-zinc-500">Captura la pieza completa. Al autorizarla, esta información se conserva al crear la orden.</p></div><select required value={form.clientId} onChange={e => field('clientId', e.target.value)} className={inputClass}><option value="">Selecciona cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="grid sm:grid-cols-2 gap-4"><input required placeholder="Descripción o pieza" value={form.pieceType} onChange={e => field('pieceType', e.target.value)} className={inputClass}/><input placeholder="Código de pieza" value={form.itemCode} onChange={e => field('itemCode', e.target.value)} className={inputClass}/></div><fieldset className="border rounded-xl p-4"><legend className="px-2 font-bold text-sm">Especificaciones de la pieza</legend><div className="grid sm:grid-cols-3 gap-3"><input placeholder="Metal" value={form.metal} onChange={e => field('metal', e.target.value)} className={inputClass}/><input placeholder="Color" value={form.color} onChange={e => field('color', e.target.value)} className={inputClass}/><input placeholder="Quilates" value={form.karats} onChange={e => field('karats', e.target.value)} className={inputClass}/><input placeholder="Peso" value={form.weight} onChange={e => field('weight', e.target.value)} className={inputClass}/><input placeholder="Medida" value={form.size} onChange={e => field('size', e.target.value)} className={inputClass}/><input placeholder="Grosor" value={form.thickness} onChange={e => field('thickness', e.target.value)} className={inputClass}/></div></fieldset><fieldset className="border rounded-xl p-4"><legend className="px-2 font-bold text-sm">Costos y vigencia</legend><div className="grid sm:grid-cols-2 gap-3"><input required type="number" min="0" step="0.01" placeholder="Total cotizado" value={form.totalAmount || ''} onChange={e => field('totalAmount', Number(e.target.value))} className={inputClass}/><input type="date" value={form.validUntil} onChange={e => field('validUntil', e.target.value)} className={inputClass}/><input type="number" min="0" step="0.01" placeholder="Mano de obra" value={form.laborCost || ''} onChange={e => field('laborCost', Number(e.target.value))} className={inputClass}/><input type="number" min="0" step="0.01" placeholder="Costo de material" value={form.materialCost || ''} onChange={e => field('materialCost', Number(e.target.value))} className={inputClass}/></div></fieldset><input type="url" placeholder="URL de foto de referencia (opcional)" value={form.imageUrl} onChange={e => field('imageUrl', e.target.value)} className={inputClass}/><textarea placeholder="Notas y detalles comerciales" value={form.notes} onChange={e => field('notes', e.target.value)} className={inputClass}/><div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button disabled={busy} className="bg-black text-white rounded-xl px-5 py-3 font-bold">Guardar borrador</button></div></form></div>}
  </div>;
}
