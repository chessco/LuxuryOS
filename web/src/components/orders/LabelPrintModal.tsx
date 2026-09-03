import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import axios from 'axios';
import { getTrackToken } from '../../utils/tracking';

const getConcepto = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'REPAIR') return 'REPARACIÓN';
    if (t === 'MANUFACTURE') return 'FABRICACIÓN';
    if (t === 'LAYAWAY') return 'APARTADO';
    return 'VENTA';
};

const getStatusLabel = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    if (['RECEIVED', 'DRAFT', 'NUEVO', 'PENDING', 'INTERES_LEAD', 'RECIBIDO'].includes(s)) return 'RECIBIDO';
    if ([
        'IN_REPAIR', 'IN_PRODUCTION', 'IN_PROGRESS', 'IN_WORKSHOP', 
        'TALLER', 'PRODUCTION', 'EN_PROCESO', 'EN_PRODUCCION', 
        'CONTROL_CALIDAD', 'QUALITY_CHECK', 'DIAGNOSIS_PENDING', 
        'WAITING_PARTS', 'SPEC_PENDING', 'MATERIALS_PENDING', 'EN TALLER'
    ].includes(s)) return 'EN TALLER';
    if ([
        'REPAIR_COMPLETED', 'READY_FOR_PICKUP', 'READY', 'COMPLETED', 
        'TERMINADO', 'LISTO', 'LISTO_ENTREGA'
    ].includes(s)) return 'LISTO';
    if (['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(s)) return 'ENTREGADO';
    if (['CANCELLED', 'CANCELADO'].includes(s)) return 'CANCELADO';
    if (['QUOTE_SENT', 'COTIZACION_ENVIADA'].includes(s)) return 'COTIZACIÓN';
    if (['APPROVED', 'APROBADO_ANTICIPO'].includes(s)) return 'APROBADO';
    if (['LAYAWAY_OPEN'].includes(s)) return 'APARTADO';
    if (['LAYAWAY_EXPIRED'].includes(s)) return 'VENCIDO';
    return s.replace(/_/g, ' ');
};

interface LabelPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({ isOpen, onClose, order }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const [sending, setSending] = useState(false);

    // --- Shared helper: build phone + encoded message for wa.me links ---
    const buildWhatsAppData = () => {
        const phone = order?.client?.phone || (order as any)?.clientPhone || '';
        if (!phone) return null;

        const formatDate = (date?: Date | string | null) => {
            const d = date ? new Date(date) : new Date();
            return d.toLocaleDateString('es-MX', {
                timeZone: 'America/Hermosillo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const orderCode = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
        const clientName = (order.client?.name || (order as any).clientName || 'Cliente').toUpperCase();
        const dateStr = formatDate(order.createdAt);

        const statusLabel = getStatusLabel(order.status);
        const isReceived = statusLabel === 'RECIBIDO';
        const isReady = statusLabel === 'LISTO';
        const isDelivered = statusLabel === 'ENTREGADO';
        const trackToken = getTrackToken(order.id);
        const trackingUrl = `https://luxuryos.pitayacode.io/track/${trackToken}`;

        const codeImageUrl = labelCodeType === 'QR'
            ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${orderCode}`
            : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${orderCode}&scale=3`;

        let message = '';
        if (isReceived) {
            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*Fecha:* ${dateStr}`,
                `*Cliente:* ${clientName}`,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                `*Status:* ${statusLabel}`,
                ``,
                `🌐 *Ver seguimiento en línea:*`,
                `${trackingUrl}`,
                ``,
                codeImageUrl,
                ``,
                `Gracias por su preferencia. ✨`,
            ].join('\n');
        } else if (isReady) {
            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*Fecha:* ${dateStr}`,
                `*Cliente:* ${clientName}`,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                `*Status:* ${statusLabel}`,
                ``,
                codeImageUrl,
                ``,
                `Gracias por su preferencia. ✨`,
            ].join('\n');
        } else if (isDelivered) {
            const deliveryDateStr = formatDate(order.deliveredAt);

            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*Fecha:* ${dateStr}`,
                `*Cliente:* ${clientName}`,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                `*Status:* ${statusLabel}`,
                `*Fecha Entrega:* ${deliveryDateStr}`,
                ``,
                `Gracias por su preferencia. ✨`,
            ].join('\n');
        } else {
            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                `*Status:* ${statusLabel}`,
            ].join('\n');
        }

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `52${cleanPhone}`;

        return { cleanPhone, encodedMessage: encodeURIComponent(message) };
    };

    // Single smart WhatsApp button — routes based on configured provider
    const handleWhatsApp = async () => {
        if (!order) return;
        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const { data: settings } = await axios.get(
                `${import.meta.env.VITE_API_URL}/settings`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const provider: string = settings?.whatsapp_provider || 'PITAYACORE';

            if (provider === 'LINKS') {
                const waData = buildWhatsAppData();
                if (!waData) {
                    alert('El cliente no tiene número de teléfono registrado.');
                    return;
                }
                window.open(`https://wa.me/${waData.cleanPhone}?text=${waData.encodedMessage}`, '_blank');
            } else {
                const result = await axios.post(
                    `${import.meta.env.VITE_API_URL}/kanban/orders/${order.id}/send-whatsapp`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (result.data?.success) {
                    alert('✅ Etiqueta enviada por WhatsApp.');
                } else {
                    alert('No se pudo enviar el mensaje por WhatsApp. Verifique que el servicio PitayaCore esté activo.');
                }
            }
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Error al enviar por WhatsApp.');
        } finally {
            setSending(false);
        }
    };

    const atelierSettings = JSON.parse(localStorage.getItem('atelier_settings') || '{}');
    let atelierName = (atelierSettings.name || 'CARED').toUpperCase();
    if (!atelierName || atelierName.includes('LUXURY')) atelierName = 'CARED';
    const labelCodeType = atelierSettings.labelCodeType || localStorage.getItem('label_code_type') || 'BARCODE';

    useEffect(() => {
        if (isOpen && order && barcodeRef.current && labelCodeType === 'BARCODE') {
            try {
                const codeValue = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
                JsBarcode(barcodeRef.current, codeValue, {
                    format: "CODE128",
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    fontSize: 10,
                    margin: 0,
                    background: "#ffffff",
                    lineColor: "#000000"
                });
            } catch (err) {
                console.error("Failed to generate barcode", err);
            }
        }
    }, [isOpen, order, labelCodeType]);

    if (!isOpen || !order) return null;

    const isTurnOrder = !!order.queueTicket;
    const clientName = (order.client?.name || order.clientName || 'CLIENTE').toUpperCase();
    const orderCode = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
    const formatDate = (date?: Date | string | null) => {
        const d = date ? new Date(date) : new Date();
        return d.toLocaleDateString('es-MX', {
            timeZone: 'America/Hermosillo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    const dateStr = formatDate(order.createdAt);

    // Extract piece info
    const pieceInfo = order.specifications?.items?.[0] || {
        item: order.pieceType || order.item || 'PIEZA',
        metal: order.metal || '-',
        color: order.color || '-',
        karats: order.karats || '-',
        weight: order.weight || '-',
        size: order.size || '-',
        thickness: order.thickness || '-'
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div>
                        <h3 className="text-white text-sm font-black uppercase tracking-widest">Etiqueta de Pedido</h3>
                        <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mt-1">Vista previa y dimensiones de impresión</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="size-8 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 flex flex-col items-center justify-center gap-6 bg-zinc-950/20 overflow-y-auto max-h-[70vh]">
                    
                    {/* Visual Label Preview Sticker container */}
                    <div className="bg-white border border-zinc-300 rounded-lg p-4 shadow-lg text-black select-none max-w-full">
                        <div 
                            id="print-label-area" 
                            className="bg-white text-black p-2 flex flex-col justify-between items-center text-center font-sans"
                            style={{ 
                                width: '220px', 
                                minHeight: '340px',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Brand Header */}
                            <div className="w-full border-b border-black pb-1 mb-1 text-center">
                                <h4 className="text-sm font-black tracking-widest leading-none m-0">{atelierName || 'CARED'}</h4>
                            </div>

                            {/* Ticket Details */}
                            <div className="w-full text-left text-[8.5px] font-bold leading-normal uppercase">
                                {/* Fecha subida arriba */}
                                <div className="text-right pb-0.5 mb-3">
                                    <span className="text-zinc-500">FECHA: </span>
                                    <span className="font-black text-black">{dateStr}</span>
                                </div>

                                {/* 2 renglones de espacio antes de los datos */}
                                <div className="space-y-1.5">
                                    <div className="border-b border-zinc-100 pb-0.5">
                                        <span className="text-zinc-500">CLIENTE: </span>
                                        <span className="font-black text-black">{clientName}</span>
                                    </div>
                                    <div className="border-b border-zinc-100 pb-0.5">
                                        <span className="text-zinc-500">NO. ORDEN: </span>
                                        <span className="font-black text-black">{orderCode}</span>
                                    </div>
                                    <div className="border-b border-zinc-100 pb-0.5">
                                        <span className="text-zinc-500">CONCEPTO: </span>
                                        <span className="font-black text-black">{getConcepto(order.type)}</span>
                                    </div>
                                    <div className="border-b border-zinc-100 pb-0.5">
                                        <span className="text-zinc-500">STATUS: </span>
                                        <span className="font-black text-black">{getStatusLabel(order.status)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode or QR Code Container */}
                            <div className="my-3 flex flex-col items-center justify-center w-full">
                                {labelCodeType === 'QR' ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="p-1 bg-white border border-black rounded">
                                            <QRCodeSVG 
                                                value={isTurnOrder ? (order.queueTicket?.qrToken || order.queueTicket?.code) : orderCode} 
                                                size={80} 
                                                bgColor="#ffffff" 
                                                fgColor="#000000" 
                                                level="H" 
                                            />
                                        </div>
                                        <span className="text-[7.5px] font-black tracking-widest uppercase mt-0.5 leading-none">
                                            {isTurnOrder ? `TURNO: ${order.queueTicket?.code?.toUpperCase()}` : orderCode}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex justify-center w-full max-w-full overflow-hidden">
                                        <svg ref={barcodeRef} className="max-w-full"></svg>
                                    </div>
                                )}
                            </div>

                            {/* Brand Footer */}
                            <div className="w-full text-center border-t border-black pt-1 mt-1">
                                <span className="text-[6px] font-black tracking-[0.2em] text-zinc-500 leading-none">GRACIAS POR SU PREFERENCIA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Styles Injection */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #print-label-area, #print-label-area * {
                            visibility: visible !important;
                        }
                        #print-label-area {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 58mm !important;
                            height: 60mm !important;
                            margin: 0 !important;
                            padding: 3mm !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            background: white !important;
                            color: black !important;
                        }
                        #print-label-area div, #print-label-area span, #print-label-area h4 {
                            color: black !important;
                            border-color: black !important;
                        }
                        @page {
                            size: 58mm 60mm;
                            margin: 0;
                        }
                    }
                `}} />

                {/* Modal Footer Actions */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 grid grid-cols-3 gap-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        disabled={sending}
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[16px]">{sending ? 'sync' : 'send'}</span>
                        <span>{sending ? 'Enviando...' : 'WhatsApp'}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                        <span>Imprimir</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
