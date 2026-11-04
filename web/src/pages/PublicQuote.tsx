import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { QuotesService } from '../services/quotes.service';

export default function PublicQuote() {
  const { token = '' } = useParams(); const [q,setQ]=useState<any>(); const [error,setError]=useState('');
  const load=()=>QuotesService.getPublic(token).then(setQ).catch(()=>setError('Cotización no disponible'));
  useEffect(load,[token]);
  const authorize=async()=>{ if(!window.confirm('¿Autorizar esta cotización?')) return; setQ(await QuotesService.authorize(token)); };
  const pdf=()=>{ const d=new jsPDF(); d.setFontSize(20); d.text('CARED',20,22); d.setFontSize(14); d.text(`Cotización ${q.quoteCode}`,20,38); d.setFontSize(11); d.text(`Cliente: ${q.clientName}`,20,50); d.text(`Detalle: ${q.pieceType}`,20,62); d.text(`Total: ${Number(q.totalAmount).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}`,20,74); if(q.notes)d.text(d.splitTextToSize(`Notas: ${q.notes}`,170),20,88); d.save(`Cotizacion-${q.quoteCode}.pdf`); };
  if(error)return <main className="min-h-screen grid place-items-center"><h1>{error}</h1></main>; if(!q)return <main className="min-h-screen grid place-items-center">Cargando…</main>;
  return <main className="min-h-screen bg-zinc-100 p-5 grid place-items-center"><article className="bg-white max-w-2xl w-full rounded-3xl p-8 shadow-xl"><h1 className="text-3xl font-black">CARED</h1><p className="text-zinc-500 mt-2">Cotización {q.quoteCode}</p><hr className="my-6"/><h2 className="text-xl font-bold">{q.clientName}</h2><p className="mt-4">{q.pieceType}</p>{q.notes&&<p className="text-zinc-600 mt-2">{q.notes}</p>}<p className="text-3xl font-black mt-8">{Number(q.totalAmount).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</p><div className="mt-8 flex gap-3 flex-wrap">{q.status==='SENT'&&<button onClick={authorize} className="bg-[#e01520] text-white px-5 py-3 rounded-xl font-bold">Autorizar cotización</button>}<button onClick={pdf} className="border px-5 py-3 rounded-xl font-bold">Descargar PDF</button></div>{q.status==='AUTHORIZED'&&<p className="mt-6 text-green-700 font-bold">Cotización autorizada</p>}</article></main>;
}
