import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

interface LabelPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({ isOpen, onClose, order }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (isOpen && order && !order.queueTicket && barcodeRef.current) {
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
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    const isTurnOrder = !!order.queueTicket;
    const clientName = (order.client?.name || order.clientName || 'CLIENTE').toUpperCase();
    const orderCode = `ORD-${order.id.substring(0, 8).toUpperCase()}`;
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }) : new Date().toLocaleDateString('es-MX');

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
                            <div className="w-full border-b border-black pb-1.5 mb-1.5">
                                <h4 className="text-sm font-black tracking-widest leading-none m-0">CARED</h4>
                                <span className="text-[7px] font-black tracking-widest text-zinc-600 block mt-0.5 leading-none">LUXURY OS</span>
                            </div>

                            {/* Ticket Details */}
                            <div className="w-full text-left space-y-1 text-[8px] font-bold leading-normal uppercase">
                                <div className="flex justify-between border-b border-zinc-100 pb-0.5">
                                    <span className="text-zinc-500">CÓDIGO:</span>
                                    <span className="font-black text-black">{orderCode}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 pb-0.5">
                                    <span className="text-zinc-500">CLIENTE:</span>
                                    <span className="font-black text-black truncate max-w-[120px]">{clientName}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 pb-0.5">
                                    <span className="text-zinc-500">PIEZA:</span>
                                    <span className="font-black text-black truncate max-w-[120px]">{pieceInfo.item.toUpperCase()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[7px] border-b border-zinc-100 pb-0.5">
                                    <div><span className="text-zinc-500">METAL:</span> {pieceInfo.metal.toUpperCase()}</div>
                                    <div><span className="text-zinc-500">COLOR:</span> {pieceInfo.color.toUpperCase()}</div>
                                    <div><span className="text-zinc-500">QUILATES:</span> {pieceInfo.karats.toUpperCase()}</div>
                                    <div><span className="text-zinc-500">PESO:</span> {pieceInfo.weight.toUpperCase()}</div>
                                </div>
                                <div className="flex justify-between text-[7px]">
                                    <span>MEDIDA: {pieceInfo.size.toUpperCase()}</span>
                                    <span>FECHA: {dateStr}</span>
                                </div>
                            </div>

                            {/* Barcode or QR Code Container */}
                            <div className="my-3 flex flex-col items-center justify-center w-full">
                                {isTurnOrder ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="p-1 bg-white border border-black rounded">
                                            <QRCodeSVG 
                                                value={order.queueTicket.qrToken || order.queueTicket.code} 
                                                size={80} 
                                                bgColor="#ffffff" 
                                                fgColor="#000000" 
                                                level="H" 
                                            />
                                        </div>
                                        <span className="text-[9px] font-black tracking-widest uppercase border border-black px-2 py-0.5 rounded bg-black text-white leading-none">
                                            TURNO: {order.queueTicket.code.toUpperCase()}
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
