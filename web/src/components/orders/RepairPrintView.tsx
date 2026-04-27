import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RepairPrintViewProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export const RepairPrintView: React.FC<RepairPrintViewProps> = ({ isOpen, onClose, order }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const pieces = order.specifications?.items || [{
        item: order.pieceType || order.item,
        metal: order.metal,
        color: order.color,
        karats: order.karats,
        weight: order.weight,
        size: order.size,
        thickness: order.thickness,
        itemCode: order.itemCode,
        description: order.notes,
        laborCost: order.laborCost,
        materialCost: order.materialCost
    }];

    // Ensure we have at least 2 slots as in the image
    const displayPieces = [...pieces];
    while (displayPieces.length < 2) {
        displayPieces.push({});
    }

    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm print:bg-white print:p-0 transition-colors">
                <motion.div
                    id="print-view"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-[#fdf2cf] w-[800px] min-h-[500px] p-12 text-zinc-900 shadow-2xl overflow-hidden print:w-full print:h-auto print:shadow-none print:p-4 print:bg-white print:m-0"
                >
                    {/* UI Only Buttons */}
                    <div className="absolute top-4 right-4 flex gap-3 print:hidden">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div ref={printRef} className="flex flex-col h-full font-serif print:text-black">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8 border-b-2 border-zinc-300 pb-4">
                            <div className="flex-1"></div>
                            <div className="flex-1 text-center">
                                <h2 className="text-2xl font-black uppercase tracking-[0.2em]">REPARACIÓN</h2>
                            </div>
                            <div className="flex-1 text-right flex items-end justify-end gap-2">
                                <span className="text-sm font-bold">Fecha</span>
                                <div className="border-b border-zinc-800 w-32 pb-1 text-center font-bold">
                                    {today}
                                </div>
                            </div>
                        </div>

                        {/* Customer Name */}
                        <div className="flex items-end gap-4 mb-8">
                            <span className="text-sm font-bold whitespace-nowrap">Nombre</span>
                            <div className="flex-1 border-b border-zinc-800 pb-1 font-bold">
                                {order.clientName}
                            </div>
                        </div>

                        {/* Pieces Loop */}
                        <div className="space-y-10">
                            {displayPieces.slice(0, 2).map((piece: any, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-6 top-1 text-lg font-black">•</div>
                                    <div className="grid grid-cols-4 gap-y-4 gap-x-6">
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Pieza</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.item}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Metal</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.metal}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Color</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.color}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Kilates</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.karats}
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Gr</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.weight}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Medida</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.size}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Grosor</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.thickness}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-xs">
                                            <span className="font-bold">Codigo</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5 text-[10px]">
                                                {piece.itemCode || `#ORD-${order.id?.substring(0, 6)}`}
                                            </div>
                                        </div>

                                        <div className="col-span-4 flex items-start gap-2 text-xs">
                                            <span className="font-bold mt-1">Descripcion</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[40px] pb-0.5 leading-relaxed">
                                                {piece.description || order.notes}
                                            </div>
                                        </div>

                                        <div className="col-span-2"></div>
                                        <div className="col-span-1 flex items-end gap-2 text-[10px]">
                                            <span className="font-bold">Mano de obra</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.laborCost ? `${Number(piece.laborCost).toLocaleString()} MXN` : ''}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end gap-2 text-[10px]">
                                            <span className="font-bold">Material</span>
                                            <div className="flex-1 border-b border-dotted border-zinc-500 min-h-[20px] pb-0.5">
                                                {piece.materialCost ? `${Number(piece.materialCost).toLocaleString()} MXN` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Section */}
                        <div className="mt-auto pt-8 border-t-2 border-zinc-300">
                            <div className="grid grid-cols-4 gap-x-8 gap-y-6">
                                <div className="flex items-end gap-2 text-xs">
                                    <span className="font-bold">Anticipo</span>
                                    <div className="flex-1 border-b border-zinc-800 pb-1 font-bold">
                                        {order.paidAmountFormatted || Number(order.paidAmount || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 text-xs">
                                    <span className="font-bold">Resta</span>
                                    <div className="flex-1 border-b border-zinc-800 pb-1 font-bold">
                                        {order.pendingAmount || Number(order.balance || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 text-xs">
                                    <span className="font-bold">Tel.</span>
                                    <div className="flex-1 border-b border-zinc-800 pb-1">
                                        {order.client?.phone || '-'}
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 text-xs">
                                    <span className="font-bold">Correo</span>
                                    <div className="flex-1 border-b border-zinc-800 pb-1 truncate text-[10px]">
                                        {order.client?.email || '-'}
                                    </div>
                                </div>

                                <div className="flex items-end gap-2 text-sm col-span-1">
                                    <span className="font-black">Total</span>
                                    <div className="flex-1 border-b-2 border-zinc-900 pb-1 font-black text-lg">
                                        {Number(order.value || 0).toLocaleString()} MXN
                                    </div>
                                </div>

                                <div className="col-span-2 flex items-center justify-center">
                                    <p className="text-[8px] italic leading-tight text-center px-4">
                                        Despues de 30 dias no nos hacemos responsables por su(s) pieza(s)
                                    </p>
                                </div>

                                <div className="col-span-1 flex flex-col items-center">
                                    <div className="w-full border-b border-zinc-800 h-10"></div>
                                    <span className="text-[10px] font-bold mt-1">Firma</span>
                                </div>
                            </div>
                        </div>

                        {/* Envelope Images Section - New */}
                        {order.specifications?.envelopeImages && order.specifications.envelopeImages.length > 0 && (
                            <div className="mt-8 border-t border-zinc-300 pt-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Fotos del Sobre / Referencia</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {order.specifications.envelopeImages.map((img: string, idx: number) => (
                                        <div key={idx} className="relative group/img aspect-video bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
                                            <img src={img} className="w-full h-full object-cover" alt={`Sobre ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page {
                                size: auto;
                                margin: 5mm;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                            body * {
                                visibility: hidden;
                            }
                            #print-view, #print-view * {
                                visibility: visible;
                            }
                            #print-view {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                height: auto;
                                margin: 0;
                                padding: 10mm;
                                box-shadow: none;
                                border: none;
                            }
                        }
                    ` }} />
                </motion.div>
            </div >
        </AnimatePresence >
    );
};
