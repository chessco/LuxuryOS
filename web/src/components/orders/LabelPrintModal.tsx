import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import axios from 'axios';
import api from '../../services/api';
import { getTrackToken } from '../../utils/tracking';
import { formatOrderCode } from '../../pages/Orders';

const getConcepto = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'REPAIR') return 'REPARACIÓN';
    if (t === 'MANUFACTURE') return 'FABRICACIÓN';
    if (t === 'DESIGN') return 'DISEÑO';
    if (t === 'LASER') return 'LÁSER';
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
    ].includes(s)) return 'TERMINADO';
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

    const pieces: any[] = order?.specifications?.items && order.specifications.items.length > 0
        ? order.specifications.items
        : [{
            item: order?.pieceType || order?.item || 'PIEZA',
            metal: order?.metal || '-',
            color: order?.color || '-',
            karats: order?.karats || '-',
            weight: order?.weight || '-',
            size: order?.size || '-',
            thickness: order?.thickness || '-',
            description: order?.notes || order?.description || ''
        }];

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

        const orderCode = order.orderCode || formatOrderCode(order);
        const clientName = (order.client?.name || (order as any).clientName || 'Cliente').toUpperCase();
        const dateStr = formatDate(order.createdAt);

        const statusLabel = getStatusLabel(order.status);
        const isReceived = statusLabel === 'RECIBIDO' || statusLabel === 'APARTADO';
        const isReady = statusLabel === 'TERMINADO' || statusLabel === 'LISTO';
        const isDelivered = statusLabel === 'ENTREGADO';
        const trackToken = getTrackToken(order.id);
        const trackingUrl = `https://luxuryos.pitayacode.io/track/${trackToken}`;

        const codeImageUrl = labelCodeType === 'QR'
            ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingUrl)}`
            : `https://bwipjs-api.metafloor.com/?bcid=code128&text=${orderCode}&scale=3`;

        const pieceSummaries = pieces.map((p, idx) => {
            const itemTitle = (p.item || p.pieceType || `Pieza ${idx + 1}`).toUpperCase();
            const specs: string[] = [];
            const metalParts = [p.metal, p.karats, p.color].filter(v => v && v !== '-');
            if (metalParts.length > 0) specs.push(metalParts.join(' '));
            const formatWeight = (w: any) => {
                const str = String(w || '').trim();
                if (!str || str === '-') return '';
                if (/(gr|g|grs|gr\.|g\.)$/i.test(str)) return str;
                return `${str} GR`;
            };

            if (p.weight && p.weight !== '-') specs.push(formatWeight(p.weight));
            if (p.size && p.size !== '-') specs.push(`Med: ${p.size}`);
            if (p.thickness && p.thickness !== '-') specs.push(`${p.thickness}`);
            const itemNote = p.description || p.notes || p.trabajo || p.work || '';

            let res = `• *${itemTitle}*`;
            if (specs.length > 0) res += ` (${specs.join(', ')})`;
            if (itemNote) res += `\n  _Nota: ${itemNote}_`;
            return res;
        }).join('\n');

        let message = '';
        if (isReceived) {
            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*Fecha:* ${dateStr}`,
                `*Cliente:* ${clientName}`,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                ``,
                `📋 *Detalle de la Orden:*`,
                pieceSummaries,
                ``,
                codeImageUrl,
                ``,
                `🌐 *Ver seguimiento en línea:*`,
                `${trackingUrl}`,
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
                ``,
                `📋 *Detalle de la Orden:*`,
                pieceSummaries,
                ``,
                codeImageUrl,
                ``,
                `🌐 *Ver seguimiento en línea:*`,
                `${trackingUrl}`,
                ``,
                `Su pieza está lista para entrega en sucursal. Gracias por su preferencia. ✨`,
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
                `*Fecha Entrega:* ${deliveryDateStr}`,
                ``,
                `📋 *Detalle de la Orden:*`,
                pieceSummaries,
                ``,
                `Gracias por su preferencia. ✨`,
            ].join('\n');
        } else {
            message = [
                `🔔 *CARED* 🔔`,
                ``,
                `*No. Orden:* ${orderCode}`,
                `*Concepto:* ${getConcepto(order.type)}`,
                ``,
                `📋 *Detalle de la Orden:*`,
                pieceSummaries,
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
    // QR de la etiqueta impresa: el enlace de seguimiento, igual al que se manda por WhatsApp
    const labelQrValue = order ? `https://luxuryos.pitayacode.io/track/${getTrackToken(order.id)}` : '';

    // El valor de este navegador solo existe si alguien guardó la configuración en este equipo;
    // la fuente de verdad es el servidor, que se consulta al abrir la etiqueta.
    const [labelCodeType, setLabelCodeType] = useState<string>(
        atelierSettings.labelCodeType || localStorage.getItem('label_code_type') || 'QR',
    );

    const autoPrintedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            autoPrintedRef.current = null;
            return;
        }
        let cancelled = false;
        api.get('/settings')
            .then(({ data }) => {
                const serverType = data?.label_code_type;
                if (cancelled || (serverType !== 'QR' && serverType !== 'BARCODE')) return;
                setLabelCodeType(serverType);
                try { localStorage.setItem('label_code_type', serverType); } catch { /* sin almacenamiento */ }
            })
            .catch(() => { /* se queda con el valor local */ });
        return () => { cancelled = true; };
    }, [isOpen]);

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

    const isTurnOrder = !!order?.queueTicket;
    const clientName = (order?.client?.name || order?.clientName || 'CLIENTE').toUpperCase();
    const orderCode = order ? (order.orderCode || formatOrderCode(order)) : '';
    const formatDate = (date?: Date | string | null) => {
        const d = date ? new Date(date) : new Date();
        return d.toLocaleDateString('es-MX', {
            timeZone: 'America/Hermosillo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    const dateStr = formatDate(order?.createdAt);

    // Extract piece info
    const pieceInfo = order?.specifications?.items?.[0] || {
        item: order?.pieceType || order?.item || 'PIEZA',
        metal: order?.metal || '-',
        color: order?.color || '-',
        karats: order?.karats || '-',
        weight: order?.weight || '-',
        size: order?.size || '-',
        thickness: order?.thickness || '-'
    };

    const printLabelViaIframe = async () => {
        const printElement = document.getElementById('print-label-area');
        if (!printElement) {
            window.print();
            return;
        }

        const labelHtml = printElement.innerHTML;

        // Limpiar portales o estilos previos de impresión
        document.getElementById('ios-print-portal')?.remove();
        document.getElementById('thermal-print-dynamic-style')?.remove();
        document.getElementById('thermal-label-print-frame')?.remove();

        // Crear portal directo en body para medir la altura real a 58mm de ancho
        // y para que en iPad/Safari sea el único elemento del DOM durante @media print
        const portal = document.createElement('div');
        portal.id = 'ios-print-portal';
        portal.style.position = 'fixed';
        portal.style.top = '0';
        portal.style.left = '0';
        portal.style.width = '62mm';
        portal.style.zIndex = '-9999';
        portal.style.opacity = '0';
        portal.style.pointerEvents = 'none';
        portal.style.background = '#ffffff';
        portal.innerHTML = `<div id="print-label-portal-content" class="bg-white text-black p-2 flex flex-col justify-between items-center text-center font-sans" style="width: 58mm; max-width: 58mm; margin: 0 auto; padding: 2mm 1mm; box-sizing: border-box;">${labelHtml}</div>`;
        document.body.appendChild(portal);

        const portalContent = document.getElementById('print-label-portal-content');
        const heightPx = portalContent?.getBoundingClientRect().height || portalContent?.scrollHeight || printElement.scrollHeight || 280;
        // Convertir px a mm (96 px = 25.4 mm) + 1mm de margen de corte.
        // Mínimo 64mm (> 62mm de ancho) para que WebKit/AirPrint siempre mantenga orientación vertical (Portrait).
        const heightMm = Math.max(64, Math.ceil((heightPx * 25.4) / 96) + 1);

        const isAppleOrSafari = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
            || (/^((?!chrome|android).)*safari/i.test(navigator.userAgent));

        if (isAppleOrSafari) {
            // Safari ignores custom HTML @page heights and prints a normal
            // sheet (including the URL footer). A custom-size PDF preserves
            // the exact roll length in AirPrint and avoids the blank tail.
            const pdfWindow = window.open('', '_blank');
            if (!pdfWindow) {
                portal.remove();
                window.alert('Safari bloqueó la vista de impresión. Permite ventanas emergentes para LuxuryOS e intenta nuevamente.');
                return;
            }
            pdfWindow.document.write('<!doctype html><title>Preparando etiqueta</title><p style="font-family:sans-serif;padding:24px">Preparando etiqueta para AirPrint…</p>');
            pdfWindow.document.close();

            try {
                portal.style.left = '-10000px';
                portal.style.opacity = '1';
                portal.style.zIndex = '-1';
                await document.fonts?.ready;
                await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

                const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                    import('html2canvas'),
                    import('jspdf'),
                ]);
                const canvas = await html2canvas(portalContent as HTMLElement, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                });

                const printScale = 1.00;
                const imageWidthMm = 58 * printScale;
                const imageHeightMm = (canvas.height / canvas.width) * imageWidthMm;
                const pageHeightMm = Math.max(25, Math.ceil(imageHeightMm + 2));
                const imageXmm = (62 - imageWidthMm) / 2;
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [62, pageHeightMm],
                    compress: true,
                });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imageXmm, 1, imageWidthMm, imageHeightMm, undefined, 'FAST');
                const pdfUrl = URL.createObjectURL(pdf.output('blob'));
                pdfWindow.location.replace(pdfUrl);
            } catch (error) {
                console.error('AirPrint PDF generation failed', error);
                pdfWindow.close();
                window.alert('No se pudo preparar la etiqueta para AirPrint. Intenta nuevamente.');
            } finally {
                portal.remove();
            }
            return;
        }

        // En Windows/Chrome removemos el portal de medición y usamos el iframe aislado con altura automática
        portal.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'thermal-label-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '62mm';
        iframe.style.height = 'auto';
        iframe.style.zIndex = '-9999';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) {
            window.print();
            return;
        }

        // Solo copiar enlaces a hojas de estilo externas
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Etiqueta ${orderCode}</title>
                ${links}
                <style>
                    @page {
                        size: 62mm auto;
                        margin: 0mm !important;
                    }
                    @page :first {
                        margin: 0mm !important;
                    }
                    * {
                        visibility: visible !important;
                        opacity: 1 !important;
                        box-sizing: border-box !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: flex-start !important;
                    }
                    #print-label-area {
                        width: 58mm !important;
                        max-width: 58mm !important;
                        height: auto !important;
                        min-height: 0 !important;
                        box-sizing: border-box !important;
                        padding: 2mm 1mm !important;
                        margin: 0 auto !important;
                        position: static !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    #print-label-area * {
                        color: #000000 !important;
                        border-color: #000000 !important;
                    }
                    /* Clases utilitarias clave para impresion termica sin depender de red */
                    .w-full { width: 100% !important; }
                    .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
                    .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
                    .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
                    .border { border-width: 1px !important; border-style: solid !important; }
                    .border-dashed { border-style: dashed !important; }
                    .border-black { border-color: #000000 !important; }
                    .border-zinc-100, .border-zinc-200, .border-zinc-300 { border-color: #000000 !important; }
                    .text-black { color: #000000 !important; }
                    .text-white { color: #ffffff !important; }
                    .bg-white { background-color: #ffffff !important; }
                    .bg-black { background-color: #000000 !important; }
                    .bg-zinc-50 { background-color: #ffffff !important; }
                    .text-center { text-align: center !important; }
                    .text-left { text-align: left !important; }
                    .text-right { text-align: right !important; }
                    .font-black { font-weight: 900 !important; }
                    .font-bold { font-weight: 700 !important; }
                    .font-normal { font-weight: 400 !important; }
                    .italic { font-style: italic !important; }
                    .uppercase { text-transform: uppercase !important; }
                    .flex { display: flex !important; }
                    .flex-col { flex-direction: column !important; }
                    .items-center { align-items: center !important; }
                    .justify-between { justify-content: space-between !important; }
                    .justify-center { justify-content: center !important; }
                    .space-y-1 > * + * { margin-top: 4px !important; }
                    .space-y-1\\.5 > * + * { margin-top: 6px !important; }
                    .space-y-2 > * + * { margin-top: 8px !important; }
                    .space-y-0\\.5 > * + * { margin-top: 2px !important; }
                    .p-1 { padding: 4px !important; }
                    .p-1\\.5 { padding: 6px !important; }
                    .p-2 { padding: 8px !important; }
                    .pb-0\\.5 { padding-bottom: 2px !important; }
                    .pb-1 { padding-bottom: 4px !important; }
                    .pb-1\\.5 { padding-bottom: 6px !important; }
                    .pt-0\\.5 { padding-top: 2px !important; }
                    .pt-1 { padding-top: 4px !important; }
                    .pt-1\\.5 { padding-top: 6px !important; }
                    .mb-1 { margin-bottom: 4px !important; }
                    .mb-1\\.5 { margin-bottom: 6px !important; }
                    .mb-2 { margin-bottom: 8px !important; }
                    .mb-3 { margin-bottom: 12px !important; }
                    .mt-0\\.5 { margin-top: 2px !important; }
                    .mt-1 { margin-top: 4px !important; }
                    .mt-1\\.5 { margin-top: 6px !important; }
                    .mt-2 { margin-top: 8px !important; }
                    .my-2 { margin-top: 8px !important; margin-bottom: 8px !important; }
                    .text-lg { font-size: 18px !important; }
                    .text-base { font-size: 16px !important; }
                    .text-sm { font-size: 14px !important; }
                    .text-xs { font-size: 12px !important; }
                    .text-\\[12px\\] { font-size: 12px !important; }
                    .text-\\[11\\.5px\\] { font-size: 11.5px !important; }
                    .text-\\[11px\\] { font-size: 11px !important; }
                    .text-\\[10\\.5px\\] { font-size: 10.5px !important; }
                    .text-\\[10px\\] { font-size: 10px !important; }
                    .text-\\[9px\\] { font-size: 9px !important; }
                    .text-\\[8\\.5px\\] { font-size: 8.5px !important; }
                    .text-\\[8px\\] { font-size: 8px !important; }
                    .text-\\[7\\.5px\\] { font-size: 7.5px !important; }
                    .text-\\[7px\\] { font-size: 7px !important; }
                    .text-\\[6px\\] { font-size: 6px !important; }
                    .tracking-widest { letter-spacing: 0.1em !important; }
                    .tracking-wider { letter-spacing: 0.05em !important; }
                    .leading-none { line-height: 1 !important; }
                    .leading-tight { line-height: 1.25 !important; }
                    .leading-snug { line-height: 1.375 !important; }
                    .leading-normal { line-height: 1.5 !important; }
                    .rounded { border-radius: 4px !important; }
                    svg { max-width: 100% !important; height: auto !important; display: block !important; margin: 0 auto !important; }
                </style>
            </head>
            <body>
                <div id="print-label-area">
                    ${labelHtml}
                </div>
            </body>
            </html>
        `);
        iframeDoc.close();

        // Esperar a que el iframe procese fuentes y SVGs antes de invocar impresión (compatible con Safari y Chromium)
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (err) {
                console.warn('Iframe print failed, fallback to window.print', err);
                window.print();
            }
        }, 450);
    };

    const handlePrint = () => {
        printLabelViaIframe();
    };

    // Impresión directa sin previsualización al abrir la etiqueta
    useEffect(() => {
        if (!isOpen || !order) return;
        const currentKey = `${order.id}-${labelCodeType}`;
        if (autoPrintedRef.current === currentKey) return;
        autoPrintedRef.current = currentKey;

        printLabelViaIframe();
        const closeTimer = setTimeout(() => {
            onClose();
        }, 250);
        return () => clearTimeout(closeTimer);
    }, [isOpen, order, labelCodeType]);

    if (!isOpen || !order) return null;

    return (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl text-left">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div>
                        <h3 className="text-white text-sm font-black uppercase tracking-widest">Etiqueta de Pedido</h3>
                        <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider mt-1">Preconfigurada para Brother QL-810W (DK-2205)</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="size-8 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 flex flex-col items-center justify-center gap-5 bg-zinc-950/20 overflow-y-auto max-h-[70vh]">
                    
                    {/* Brother DK-2205 Specs Pill */}
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-[10px] font-bold text-zinc-300 shadow-sm">
                        <span className="material-symbols-outlined text-[15px] text-amber-500">print</span>
                        <span>Brother QL-810W &bull; DK-2205 (62 mm continuo)</span>
                    </div>

                    {/* Visual Label Preview Sticker container */}
                    <div className="bg-white border border-zinc-300 rounded-lg p-4 shadow-lg text-black select-none max-w-full">
                        <div 
                            id="print-label-area" 
                            className="bg-white text-black p-2 flex flex-col justify-between items-center text-center font-sans"
                            style={{ 
                                width: '255px', 
                                height: 'auto',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Brand Header */}
                            <div className="w-full border-b-2 border-black pb-1 mb-1 text-center">
                                <h4 className="text-base font-black tracking-widest leading-none m-0">{atelierName || 'CARED'}</h4>
                            </div>

                            {/* Ticket Details */}
                            <div className="w-full text-left uppercase">
                                {/* Fecha subida arriba */}
                                <div className="text-right pb-0.5 mb-1.5 text-[11px] font-bold">
                                    <span className="text-zinc-600 font-bold">FECHA: </span>
                                    <span className="font-black text-black">{dateStr}</span>
                                </div>

                                {/* Datos principales */}
                                <div className="space-y-1 text-[11px] font-bold">
                                    <div className="border-b border-black pb-0.5">
                                        <span className="text-zinc-700">CLIENTE: </span>
                                        <span className="font-black text-black">{clientName}</span>
                                    </div>
                                    <div className="border-b border-black pb-0.5">
                                        <span className="text-zinc-700">NO. ORDEN: </span>
                                        <span className="font-black text-black">{orderCode}</span>
                                    </div>
                                    <div className="border-b border-black pb-0.5">
                                        <span className="text-zinc-700">CONCEPTO: </span>
                                        <span className="font-black text-black">{getConcepto(order.type)}</span>
                                    </div>

                                    {/* DETALLE DE LA ORDEN: ORO, GRAMOS, MEDIDA, GROSOR Y NOTAS POR ITEM */}
                                    <div className="pt-1 mt-1.5 border-t border-dashed border-black">
                                        <div className="text-[10px] font-black text-black tracking-wider mb-1">
                                            DETALLE DE LA ORDEN:
                                        </div>
                                        <div className="space-y-1">
                                            {pieces.map((p, idx) => {
                                                const itemTitle = (p.item || p.pieceType || `Pieza ${idx + 1}`).toUpperCase();
                                                const specs: string[] = [];
                                                const metalParts = [p.metal, p.karats, p.color].filter(v => v && v !== '-');
                                                if (metalParts.length > 0) specs.push(metalParts.join(' '));
                                                const formatWeight = (w: any) => {
                                                    const str = String(w || '').trim();
                                                    if (!str || str === '-') return '';
                                                    if (/(gr|g|grs|gr\.|g\.)$/i.test(str)) return str;
                                                    return `${str} GR`;
                                                };

                                                if (p.weight && p.weight !== '-') specs.push(formatWeight(p.weight));
                                                if (p.size && p.size !== '-') specs.push(`Med: ${p.size}`);
                                                if (p.thickness && p.thickness !== '-') specs.push(`${p.thickness}`);

                                                const itemNote = p.description || p.notes || p.trabajo || p.work || '';

                                                return (
                                                    <div key={idx} className="bg-white p-1.5 rounded border border-black text-[10.5px] space-y-0.5 text-left">
                                                        <div className="font-black text-black flex justify-between items-center text-[11.5px] leading-tight">
                                                            <span>{itemTitle}</span>
                                                            {pieces.length > 1 && (
                                                                <span className="text-black text-[10px] font-black">#{idx + 1}</span>
                                                            )}
                                                        </div>
                                                        {specs.length > 0 && (
                                                            <div className="text-black font-bold text-[10.5px] leading-tight">
                                                                {specs.join(' • ')}
                                                            </div>
                                                        )}
                                                        {itemNote && (
                                                            <div className="text-black font-normal italic text-[10px] leading-tight pt-0.5 border-t border-black/30">
                                                                <span className="font-bold not-italic text-black">NOTA: </span>
                                                                {itemNote}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode or QR Code Container */}
                            <div className="my-1.5 flex flex-col items-center justify-center w-full">
                                {labelCodeType === 'QR' ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="p-1 bg-white border border-black rounded">
                                            {/* Mismo QR que el de WhatsApp: enlace de seguimiento, que también abre la orden en el escáner */}
                                            <QRCodeSVG
                                                value={isTurnOrder ? (order.queueTicket?.qrToken || order.queueTicket?.code) : labelQrValue}
                                                size={isTurnOrder ? 68 : 82}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level={isTurnOrder ? 'M' : 'L'}
                                            />
                                        </div>
                                        <span className="text-[11px] font-black tracking-widest uppercase mt-0.5 leading-none">
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
                                <span className="text-[8.5px] font-black tracking-[0.2em] text-black leading-none">GRACIAS POR SU PREFERENCIA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 grid grid-cols-2 gap-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Cerrar
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
