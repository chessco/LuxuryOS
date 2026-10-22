import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { OrdersService } from '../../services/orders.service';
import { PaymentModal } from './PaymentModal';
import { ClientHistoryModal } from './ClientHistoryModal';
import { getStatusLabel } from '../../pages/Orders';


interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderUpdated?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onOrderUpdated }) => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isProcessingRef = useRef(false);
    const lastScannedCodeRef = useRef<string>('');
    const lastScannedTimeRef = useRef<number>(0);

    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [foundOrder, setFoundOrder] = useState<any | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [isClientHistoryOpen, setIsClientHistoryOpen] = useState(false);
    const [isDelivering, setIsDelivering] = useState(false);
    const [isReturning, setIsReturning] = useState(false);

    // RF-03 & RF-04: Liquidar y Entregar en un solo escaneo + Consultar Pagos
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [settleMethod, setSettleMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [settleNotes, setSettleNotes] = useState('');
    const [isSettling, setIsSettling] = useState(false);
    const [isPaymentsHistoryOpen, setIsPaymentsHistoryOpen] = useState(false);
    const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);


    const user = React.useMemo(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) return JSON.parse(raw);
        } catch {}
        return null;
    }, []);
    const isJoyero = user?.role === 'JOYERO' || String(user?.email || '').toLowerCase().includes('joyero');

    // Synthesize short beep chime for scan success
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch {}
    };

    // Extract order code or token from scanned text/url
    const parseScannedCode = (raw: string): string => {
        if (!raw) return '';
        let trimmed = raw.trim();
        try {
            trimmed = decodeURIComponent(trimmed).trim();
        } catch {}

        // 1. Check for URL track link: https://.../track/{token}
        const trackMatch = trimmed.match(/\/track\/([a-zA-Z0-9_-]+)/i);
        if (trackMatch) return trackMatch[1].trim();

        // 2. Check for order URL: https://.../orders/{id}
        const orderUrlMatch = trimmed.match(/\/orders\/([a-zA-Z0-9_-]+)/i);
        if (orderUrlMatch) return orderUrlMatch[1].trim();

        // 3. Remove common prefixes like "TURNO:", "ORDEN:", "ORD:", "TICKET:", "CODE:"
        const cleanPrefixed = trimmed.replace(/^(TURNO|ORDEN|ORD|TICKET|CODE|CODIGO|QR)\s*[:#-]?\s*/i, '').trim();

        // 4. If URL without /track/ or /orders/, take last segment
        if (cleanPrefixed.startsWith('http://') || cleanPrefixed.startsWith('https://')) {
            try {
                const url = new URL(cleanPrefixed);
                const segments = url.pathname.split('/').filter(Boolean);
                if (segments.length > 0) return segments[segments.length - 1];
            } catch {}
        }

        // 5. Standard order code pattern: REP-38, FAB-12, DIS-01, LAS-02, APT-03, PED-14, R-01, etc.
        const codeMatch = cleanPrefixed.match(/^([A-Za-z]{1,4})\s*[-_ ]?\s*(\d+)$/);
        if (codeMatch) {
            return `${codeMatch[1].toUpperCase()}-${codeMatch[2]}`;
        }

        return cleanPrefixed;
    };

    const fetchOrderByCode = async (rawCode: string) => {
        const clean = parseScannedCode(rawCode);
        if (!clean) {
            isProcessingRef.current = false;
            return;
        }

        setIsLoadingOrder(true);
        setActionMessage(null);
        setScanError(null);
        try {
            const order = await OrdersService.getOrder(clean);
            if (order && order.id) {
                playBeep();
                setFoundOrder(order);
                stopCamera();
            } else {
                setScanError(`No se encontró ninguna orden con el código: "${clean}"`);
            }
        } catch (err: any) {
            console.error('Error fetching order from QR:', err);
            const msg = err?.response?.data?.message || err?.message || 'Orden no encontrada';
            setScanError(`No se encontró ninguna orden con el código: "${clean}". (${typeof msg === 'string' ? msg : 'No encontrada'})`);
        } finally {
            setIsLoadingOrder(false);
            isProcessingRef.current = false;
        }
    };

    const onCodeDetected = (code: string) => {
        if (!code) return;
        const now = Date.now();
        if (isProcessingRef.current) return;
        if (code === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
            return;
        }
        lastScannedCodeRef.current = code;
        lastScannedTimeRef.current = now;
        isProcessingRef.current = true;
        fetchOrderByCode(code);
    };

    // Start iPad/Device Camera
    const startCamera = async () => {
        setCameraError(null);
        setIsScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                await videoRef.current.play();
                startScanLoop();
            }
        } catch (err: any) {
            console.error('Camera access error:', err);
            setCameraError('No se pudo acceder a la cámara del iPad. Verifica los permisos de Safari.');
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    // Continuous scanning loop
    const startScanLoop = () => {
        let detector: any = null;
        if ('BarcodeDetector' in window) {
            try {
                detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
            } catch {}
        }

        const scan = async () => {
            const video = videoRef.current;
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animationFrameRef.current = requestAnimationFrame(scan);
                return;
            }

            try {
                if (detector) {
                    const barcodes = await detector.detect(video);
                    if (barcodes && barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        if (code) {
                            onCodeDetected(code);
                        }
                    }
                } else if ((window as any).jsQR) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height);
                            if (code && code.data) {
                                onCodeDetected(code.data);
                            }
                        }
                    }
                }
            } catch (scanErr) {
                console.debug('Frame scan error:', scanErr);
            }

            animationFrameRef.current = requestAnimationFrame(scan);
        };

        animationFrameRef.current = requestAnimationFrame(scan);
    };

    // Load jsQR script fallback for iPadOS if needed
    useEffect(() => {
        if (!('BarcodeDetector' in window) && !(window as any).jsQR) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    // Close on Escape key press
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && !foundOrder) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, foundOrder]);

    const handleResetScan = () => {
        setFoundOrder(null);
        setActionMessage(null);
        setScanError(null);
        setManualCode('');
        isProcessingRef.current = false;
        lastScannedCodeRef.current = '';
        lastScannedTimeRef.current = 0;
        startCamera();
    };

    // Quick Status Update Actions
    const handleUpdateStatus = async (newStatus: string, labelText: string) => {
        if (!foundOrder) return;
        try {
            await OrdersService.moveOrder(foundOrder.id, newStatus);
            setActionMessage(`¡Orden actualizada con éxito a ${labelText}! ✨`);
            const effectiveStatus = (newStatus === 'RETURNED' || newStatus === 'DEVUELTO') ? 'RECEIVED' : newStatus;
            setFoundOrder((prev: any) => ({ ...prev, status: effectiveStatus, stage: effectiveStatus }));
            if (onOrderUpdated) onOrderUpdated();
        } catch (err: any) {
            console.error('Error changing status:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al actualizar el estado de la orden';
            alert(typeof msg === 'string' ? msg : 'Error al actualizar el estado de la orden');
        }
    };

    // RF-03 Flujo B: Registrar abono sin entregar el trabajo
    const handleRegisterPayment = async (amount: number, method: string) => {
        if (!foundOrder) return;
        await OrdersService.registerPayment(foundOrder.id, amount, method);
        playBeep();
        setActionMessage(`¡Abono de $${amount.toLocaleString()} MXN registrado con éxito! Saldo actualizado. (Trabajo NO entregado) 💳`);
        const updated = await OrdersService.getOrder(foundOrder.id);
        setFoundOrder(updated);
        if (onOrderUpdated) onOrderUpdated();
    };

    // RF-03 Flujo A: Liquidar saldo pendiente y entregar físicamente en un solo escaneo
    const handleSettleAndDeliver = async () => {
        if (!foundOrder) return;
        setIsSettling(true);
        try {
            const res = await OrdersService.settleAndDeliverOrderViaQr(foundOrder.id, {
                paymentMethod: settleMethod,
                notes: settleNotes?.trim() || undefined,
            });
            playBeep();
            const settled = res?.settledAmount ?? pendingAmount;
            setActionMessage(
                settled > 0
                    ? `¡Orden liquidada ($${settled.toLocaleString()} MXN) y entregada al cliente con éxito en un solo escaneo! 📦✨`
                    : '¡Orden entregada físicamente al cliente con éxito! 📦✨'
            );
            setIsSettleModalOpen(false);
            setSettleNotes('');
            const updated = await OrdersService.getOrder(foundOrder.id);
            setFoundOrder(updated);
            if (onOrderUpdated) onOrderUpdated();
        } catch (err: any) {
            console.error('Error settling and delivering via QR:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al liquidar y entregar la orden';
            alert(typeof msg === 'string' ? msg : 'Error al liquidar y entregar la orden');
        } finally {
            setIsSettling(false);
        }
    };

    // RF-03 Flujo C: Confirmar entrega física cuando la orden ya está liquidada (saldo = 0)
    const handleConfirmDelivery = async () => {
        if (!foundOrder) return;
        if (!window.confirm('¿Confirmar la entrega física del trabajo al cliente? (Orden liquidada con saldo en cero)')) {
            return;
        }
        setIsDelivering(true);
        try {
            await OrdersService.settleAndDeliverOrderViaQr(foundOrder.id);
            playBeep();
            setActionMessage('¡Entrega física confirmada con éxito! (Orden liquidada) 📦✨');
            const updated = await OrdersService.getOrder(foundOrder.id);
            setFoundOrder(updated);
            if (onOrderUpdated) onOrderUpdated();
        } catch (err: any) {
            console.error('Error confirming QR delivery:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al registrar la entrega';
            alert(typeof msg === 'string' ? msg : 'Error al registrar la entrega');
        } finally {
            setIsDelivering(false);
        }
    };

    // RF-04: Consultar historial de pagos del trabajo
    const handleOpenPaymentsHistory = async () => {
        if (!foundOrder) return;
        setIsPaymentsHistoryOpen(true);
        setIsLoadingPayments(true);
        try {
            const payments = await OrdersService.getPayments(foundOrder.id);
            setPaymentsHistory(Array.isArray(payments) ? payments : []);
        } catch (err) {
            console.error('Error fetching payments:', err);
            setPaymentsHistory(foundOrder.specifications?.payments || []);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    // RF-02: Devolver sobre / trabajo no realizado al cliente mediante QR
    const handleConfirmReturnToClient = async () => {
        if (!foundOrder) return;
        if (!returnReason.trim()) {
            alert('Es obligatorio ingresar el motivo de la devolución al cliente.');
            return;
        }
        setIsReturning(true);
        try {
            await OrdersService.returnOrderToClientViaQr(foundOrder.id, returnReason.trim());
            playBeep();
            setActionMessage('¡Trabajo devuelto físicamente al cliente! (No realizado) ↩️');
            setIsReturnModalOpen(false);
            setReturnReason('');
            const updated = await OrdersService.getOrder(foundOrder.id);
            setFoundOrder(updated);
            if (onOrderUpdated) onOrderUpdated();
        } catch (err: any) {
            console.error('Error returning order via QR:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al registrar la devolución';
            alert(typeof msg === 'string' ? msg : 'Error al registrar la devolución');
        } finally {
            setIsReturning(false);
        }
    };


    if (!isOpen) return null;

    const laborCost = Number(foundOrder?.laborCost || foundOrder?.value || 0);
    const materialCost = Number(foundOrder?.materialCost || foundOrder?.cost || 0);
    // El material es un costo interno: el cobro es la mano de obra / venta, no labor + material
    const totalAmount = Number(foundOrder?.totalAmount || laborCost || foundOrder?.value || 0);
    const paidAmount = Number(foundOrder?.paidAmount || 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const orderCode = foundOrder?.orderCode || foundOrder?.specifications?.orderCode || `ORD-${foundOrder?.id?.slice(0, 5)}`;
    const clientName = foundOrder?.client?.name || foundOrder?.client || 'Cliente';
    const pieceName = foundOrder?.pieceType || foundOrder?.item || 'Pieza';

    // Portal to body: the Header's backdrop-filter would otherwise act as the
    // containing block for `fixed` and clip the modal to the header height.
    return createPortal(
        <AnimatePresence>
            <div
                onClick={onClose}
                className="fixed inset-0 z-[120] overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md cursor-pointer"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg max-h-[92vh] my-auto bg-card border border-border rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col text-foreground cursor-default"
                >
                    {/* Header */}
                    <div className="shrink-0 px-5 py-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/40">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                                <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                            </div>
                            <div>
                                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">Lector QR / Código</h3>
                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                                    {isJoyero ? 'Acciones Rápidas Taller' : 'Acciones Rápidas Ventas'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="size-9 sm:size-10 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer border border-border/50 active:scale-95"
                            title="Cerrar ventana (Esc)"
                        >
                            <span className="material-symbols-outlined text-[22px]">close</span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
                        {!foundOrder ? (
                            <>
                                {/* Camera Viewfinder */}
                                <div className="relative aspect-[4/3] sm:aspect-square max-h-[220px] sm:max-h-[280px] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-border shadow-inner">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Scan Frame Overlay */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8">
                                        <div className="relative size-40 sm:size-52 border-2 border-indigo-400/80 rounded-2xl sm:rounded-3xl shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
                                            <div className="absolute top-0 left-0 size-5 sm:size-6 border-t-4 border-l-4 border-white rounded-tl-xl -mt-1 -ml-1"></div>
                                            <div className="absolute top-0 right-0 size-5 sm:size-6 border-t-4 border-r-4 border-white rounded-tr-xl -mt-1 -mr-1"></div>
                                            <div className="absolute bottom-0 left-0 size-5 sm:size-6 border-b-4 border-l-4 border-white rounded-bl-xl -mb-1 -ml-1"></div>
                                            <div className="absolute bottom-0 right-0 size-5 sm:size-6 border-b-4 border-r-4 border-white rounded-br-xl -mb-1 -mr-1"></div>
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                                                Apunta al código QR
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick floating close on camera view */}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10"
                                        title="Cerrar lector"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>

                                    {cameraError && (
                                        <div className="absolute inset-0 bg-background/90 p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3">
                                            <span className="material-symbols-outlined text-red-500 text-3xl sm:text-4xl">videocam_off</span>
                                            <p className="text-xs font-bold text-foreground">{cameraError}</p>
                                            <button
                                                onClick={startCamera}
                                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider"
                                            >
                                                Reintentar Cámara
                                            </button>
                                        </div>
                                    )}

                                    {isLoadingOrder && (
                                        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
                                            <span className="material-symbols-outlined text-indigo-500 text-4xl animate-spin">sync</span>
                                            <span className="text-xs font-black uppercase tracking-widest">Buscando orden...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Scan Error Banner */}
                                {scanError && (
                                    <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-500 text-xs animate-in fade-in duration-200">
                                        <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold break-words">{scanError}</p>
                                            <p className="text-[11px] opacity-80 mt-1">Apunta la cámara a otro código o introduce el código abajo.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setScanError(null)}
                                            className="text-red-400 hover:text-red-300 cursor-pointer p-0.5"
                                            title="Cerrar aviso"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                )}

                                {/* Manual Input Fallback */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1 block">
                                        O ingresa el ID / Código manualmente
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    fetchOrderByCode(manualCode);
                                                }
                                            }}
                                            placeholder="Ej: REP-28 o código de barras"
                                            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 sm:py-3 text-sm text-foreground outline-none focus:border-indigo-500 transition-all font-mono uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fetchOrderByCode(manualCode)}
                                            disabled={!manualCode.trim() || isLoadingOrder}
                                            className="px-5 py-2.5 sm:py-3 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-md cursor-pointer"
                                        >
                                            Buscar
                                        </button>
                                    </div>

                                    {/* Explicit Cancel / Close Button */}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                        <span>Cerrar</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Order Found - Role Action Panel */
                            <div className="space-y-6">
                                {/* Success feedback banner */}
                                {actionMessage && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                                        {actionMessage}
                                    </div>
                                )}

                                {/* Tabla Resumen RF-04 */}
                                <div className="bg-muted/40 border border-border rounded-2xl overflow-hidden shadow-inner">
                                    <div className="p-3.5 bg-muted/60 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-indigo-500 text-[18px]">receipt_long</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Resumen de Mostrador
                                            </span>
                                        </div>
                                        <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                                            {orderCode}
                                        </span>
                                    </div>

                                    {/* Tabla con los conceptos exactos requeridos por RF-04 */}
                                    <div className="divide-y divide-border/60 text-xs">
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Orden</span>
                                            <span className="font-mono font-black text-foreground">{orderCode}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Cliente</span>
                                            <span className="font-black text-foreground uppercase truncate max-w-[220px]">{clientName}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Total</span>
                                            <span className="font-mono font-black text-foreground">${totalAmount.toLocaleString()} MXN</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Abonos registrados</span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">${paidAmount.toLocaleString()} MXN</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 bg-amber-500/5">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Saldo pendiente</span>
                                            <span className={`font-mono font-black ${pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                ${pendingAmount.toLocaleString()} MXN
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Trabajo</span>
                                            <div>
                                                {(() => {
                                                    const rawStatus = (foundOrder.status || foundOrder.stage || '').toUpperCase();
                                                    const isReadyForDelivery =
                                                        rawStatus === 'REPAIR_COMPLETED' ||
                                                        rawStatus === 'READY_FOR_PICKUP' ||
                                                        rawStatus === 'LISTO_ENTREGA' ||
                                                        rawStatus === 'TERMINADO' ||
                                                        rawStatus === 'READY';
                                                    const isJoyeroReturned =
                                                        rawStatus === 'RETURNED' ||
                                                        rawStatus === 'CANCELLED' ||
                                                        foundOrder.specifications?.isReturned === true;

                                                    if (isReadyForDelivery) {
                                                        return (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                Listo para entrega
                                                            </span>
                                                        );
                                                    }
                                                    if (isJoyeroReturned) {
                                                        return (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                Cancelado / Devuelto
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                            {getStatusLabel(foundOrder.status || foundOrder.stage)}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 px-4 hover:bg-muted/30 transition-colors">
                                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Entrega física</span>
                                            <div>
                                                {(() => {
                                                    const rawStatus = (foundOrder.status || foundOrder.stage || '').toUpperCase();
                                                    const isAlreadyDelivered = rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO_POSTVENTA' || !!foundOrder.deliveredAt;
                                                    const isReturnedToClient = !!(foundOrder.specifications?.isReturnedToClient || foundOrder.specifications?.isReturnedNotDone);

                                                    if (isAlreadyDelivered) {
                                                        return (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">check</span>
                                                                Entregado
                                                            </span>
                                                        );
                                                    }
                                                    if (isReturnedToClient) {
                                                        return (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                Devuelto al Cliente
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                                                            Pendiente
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Role Specific Action Buttons */}
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                                        {isJoyero ? 'Acciones para Joyero' : 'Acciones de Mostrador'}
                                    </div>

                                    {!isJoyero ? (
                                        /* Mostrador Actions: RF-03 & RF-04 */
                                        <div className="space-y-3">
                                            {(() => {
                                                const rawStatus = (foundOrder.status || foundOrder.stage || '').toUpperCase();
                                                const isAlreadyDelivered = rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO_POSTVENTA' || !!foundOrder.deliveredAt;
                                                const isReturnedToClient = !!(foundOrder.specifications?.isReturnedToClient || foundOrder.specifications?.isReturnedNotDone);
                                                const isReadyForDelivery =
                                                    rawStatus === 'REPAIR_COMPLETED' ||
                                                    rawStatus === 'READY_FOR_PICKUP' ||
                                                    rawStatus === 'LISTO_ENTREGA' ||
                                                    rawStatus === 'TERMINADO' ||
                                                    rawStatus === 'READY';
                                                const isJoyeroReturned =
                                                    rawStatus === 'RETURNED' ||
                                                    rawStatus === 'CANCELLED' ||
                                                    foundOrder.specifications?.isReturned === true ||
                                                    !!foundOrder.specifications?.returnedBy ||
                                                    !!foundOrder.specifications?.returnReason;

                                                if (isAlreadyDelivered) {
                                                    return (
                                                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[20px]">task_alt</span>
                                                                <span className="font-black uppercase tracking-wide">Trabajo Entregado al Cliente</span>
                                                            </div>
                                                            <p className="text-[11px] opacity-80 pl-7">
                                                                Entregado el {foundOrder.deliveredAt ? new Date(foundOrder.deliveredAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recientemente'}
                                                                {foundOrder.specifications?.deliveredByName ? ` por ${foundOrder.specifications.deliveredByName}` : ''}.
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                if (isReturnedToClient) {
                                                    return (
                                                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[20px]">assignment_return</span>
                                                                <span className="font-black uppercase tracking-wide">Devuelto al Cliente — No Realizado</span>
                                                            </div>
                                                            <p className="text-[11px] opacity-80 pl-7">
                                                                Devolución física registrada el {foundOrder.specifications?.returnedToClientAt ? new Date(foundOrder.specifications.returnedToClientAt).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'recientemente'}
                                                                {foundOrder.specifications?.returnedToClientByName ? ` por ${foundOrder.specifications.returnedToClientByName}` : ''}.
                                                            </p>
                                                            {foundOrder.specifications?.returnReason && (
                                                                <p className="text-[11px] opacity-90 pl-7 font-normal">
                                                                    Motivo: {foundOrder.specifications.returnReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        {/* RF-03 Flujo A: Botón Liquidar y Entregar (Un solo escaneo) */}
                                                        {isReadyForDelivery && pendingAmount > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSettleMethod('CASH');
                                                                    setIsSettleModalOpen(true);
                                                                }}
                                                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
                                                                        <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                                                                    </div>
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="text-sm">Liquidar y entregar</span>
                                                                        <span className="text-[10px] font-medium opacity-90">
                                                                            Cobrar saldo (${pendingAmount.toLocaleString()} MXN) y entregar
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                                            </button>
                                                        )}

                                                        {/* RF-03 Flujo C: Botón Confirmar Entrega (Cuando saldo es 0 y trabajo liberado) */}
                                                        {isReadyForDelivery && pendingAmount === 0 && (
                                                            <button
                                                                type="button"
                                                                disabled={isDelivering}
                                                                onClick={handleConfirmDelivery}
                                                                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                                                            >
                                                                <span className="material-symbols-outlined text-2xl">task_alt</span>
                                                                <div className="flex flex-col text-left">
                                                                    <span>{isDelivering ? 'Registrando Entrega...' : 'Confirmar Entrega'}</span>
                                                                    <span className="text-[9px] font-medium opacity-90">Saldo liquidado ($0 MXN) • Entregar al cliente</span>
                                                                </div>
                                                            </button>
                                                        )}

                                                        {/* Advertencia si no está liberado por el Joyero */}
                                                        {!isReadyForDelivery && !isJoyeroReturned && (
                                                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                                                                <span className="material-symbols-outlined text-[20px] shrink-0">hourglass_top</span>
                                                                <span>Pendiente de Producción: La orden no ha sido liberada por el taller. No puede entregarse todavía.</span>
                                                            </div>
                                                        )}

                                                        {/* RF-03 Flujo B: Botón Registrar Abono (sin entregar) */}
                                                        {pendingAmount > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsPaymentOpen(true)}
                                                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="material-symbols-outlined text-xl">payments</span>
                                                                    <div className="flex flex-col text-left">
                                                                        <span>Registrar abono</span>
                                                                        <span className="text-[9px] font-medium opacity-90">
                                                                            Recibir pago parcial sin entregar el trabajo
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-mono font-black">${pendingAmount.toLocaleString()} pendiente</span>
                                                            </button>
                                                        )}

                                                        {/* Botón Devolución Trabajo No Realizado */}
                                                        {isJoyeroReturned && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReturnReason(foundOrder.specifications?.returnReason || '');
                                                                    setIsReturnModalOpen(true);
                                                                }}
                                                                className="w-full py-3 px-4 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                                                                <span>Cancelar / Devolver trabajo al cliente</span>
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        /* Joyero Actions: Terminado y Devuelto */
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(
                                                    foundOrder.type === 'MANUFACTURE' ? 'READY_FOR_PICKUP' : 'REPAIR_COMPLETED',
                                                    'Terminado'
                                                )}
                                                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-2xl">verified</span>
                                                <span>Terminado</span>
                                                <span className="text-[9px] font-medium opacity-80">Listo para entrega</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus('RETURNED', 'Devuelto (Recibido)')}
                                                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-2xl">assignment_return</span>
                                                <span>Devuelto</span>
                                                <span className="text-[9px] font-medium opacity-80">Regresar a Recibido</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* RF-04: Botón Consultar Pagos (Historial financiero) */}
                                    <button
                                        type="button"
                                        onClick={handleOpenPaymentsHistory}
                                        className="w-full py-2.5 px-4 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                        <span>Consultar pagos e historial financiero</span>
                                    </button>

                                    {/* Botón Historial del Cliente */}
                                    <button
                                        type="button"
                                        onClick={() => setIsClientHistoryOpen(true)}
                                        className="w-full py-2.5 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">history</span>
                                        <span>Consultar Historial del Cliente</span>
                                    </button>

                                    {/* Auxiliary Actions: Ver Orden & Escanear Otra */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                navigate(`/orders/${foundOrder.id}`);
                                            }}
                                            className="flex-1 py-3 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-foreground text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            <span>Ver Orden</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetScan}
                                            className="flex-1 py-3 px-4 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                                            <span>Escanear Otro</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                        <span>Cerrar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>


            {/* Payment Modal for Cobrar action */}
            {foundOrder && (
                <PaymentModal
                    isOpen={isPaymentOpen}
                    onClose={() => setIsPaymentOpen(false)}
                    totalAmount={totalAmount}
                    pendingAmount={pendingAmount}
                    laborCost={laborCost}
                    materialCost={materialCost}
                    pieceType={pieceName}
                    onRegisterPayment={handleRegisterPayment}
                />
            )}

            {/* Modal de Motivo de Devolución al Cliente (RF-02) */}
            {isReturnModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isReturning && setIsReturnModalOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-foreground cursor-default z-10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-sm shrink-0">
                                <span className="material-symbols-outlined text-[24px]">assignment_return</span>
                            </div>
                            <div>
                                <h4 className="font-black text-base uppercase tracking-tight">Devolver sobre al cliente</h4>
                                <p className="text-muted-foreground text-xs">Trabajo no realizado / cancelado</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                            <span className="font-bold">Regla de negocio:</span> Esta acción registrará la entrega física del sobre no realizado. La orden se conservará como <b>"Devuelto — No realizado"</b>.
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Motivo de la Devolución <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                rows={3}
                                placeholder="Indique la razón de la devolución o cancelación..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={isReturning}
                                onClick={() => setIsReturnModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isReturning || !returnReason.trim()}
                                onClick={handleConfirmReturnToClient}
                                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                <span>{isReturning ? 'Guardando...' : 'Confirmar Devolución'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Historial de Reparaciones del Cliente (RF-04) */}
            <ClientHistoryModal
                isOpen={isClientHistoryOpen}
                onClose={() => setIsClientHistoryOpen(false)}
                clientId={foundOrder?.clientId || foundOrder?.client?.id}
                clientName={foundOrder?.client?.name || foundOrder?.customerName}
            />

            {/* Modal RF-03 Flujo A: Liquidar y Entregar en un solo escaneo */}
            {isSettleModalOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isSettling && setIsSettleModalOpen(false)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-foreground cursor-default z-10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                            </div>
                            <div>
                                <h4 className="font-black text-base uppercase tracking-tight">Liquidar y Entregar</h4>
                                <p className="text-muted-foreground text-xs">{orderCode} — {clientName}</p>
                            </div>
                        </div>

                        {/* Resumen del Saldo */}
                        <div className="p-4 bg-muted/50 border border-border rounded-2xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Monto a liquidar:</span>
                                <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                                    ${pendingAmount.toLocaleString()} MXN
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium">
                                Al confirmar, se registrará el pago restante de ${pendingAmount.toLocaleString()} MXN y la orden quedará marcada como <strong>Entregada</strong> en una sola operación.
                            </p>
                        </div>

                        {/* Selector de Método de Pago */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Método de Pago
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'CASH', label: 'Efectivo', icon: 'payments' },
                                    { id: 'CARD', label: 'Tarjeta', icon: 'credit_card' },
                                    { id: 'TRANSFER', label: 'Transfer.', icon: 'account_balance' },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSettleMethod(m.id as any)}
                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            settleMethod === m.id
                                                ? 'bg-foreground border-foreground text-background shadow-md'
                                                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notas opcionales */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Referencia o Notas (Opcional)
                            </label>
                            <input
                                type="text"
                                value={settleNotes}
                                onChange={(e) => setSettleNotes(e.target.value)}
                                placeholder="Ej: Folio terminal / transferencia"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                            />
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={isSettling}
                                onClick={() => setIsSettleModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isSettling}
                                onClick={handleSettleAndDeliver}
                                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                <span>{isSettling ? 'Procesando...' : 'Confirmar y Entregar'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal RF-04: Historial Financiero / Consultar Pagos */}
            {isPaymentsHistoryOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsPaymentsHistoryOpen(false)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-lg max-h-[85vh] bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-foreground cursor-default z-10 overflow-hidden"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shrink-0">
                                    <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-base uppercase tracking-tight">Historial Financiero</h4>
                                    <p className="text-muted-foreground text-xs">{orderCode} — {clientName}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPaymentsHistoryOpen(false)}
                                className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Desglose rápido */}
                        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-muted/40 border border-border/60">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Total</span>
                                <span className="font-mono font-black text-xs sm:text-sm text-foreground">${totalAmount.toLocaleString()} MXN</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Abonado</span>
                                <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">${paidAmount.toLocaleString()} MXN</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Pendiente</span>
                                <span className={`font-mono font-black text-xs sm:text-sm ${pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    ${pendingAmount.toLocaleString()} MXN
                                </span>
                            </div>
                        </div>

                        {/* Lista de Pagos */}
                        <div className="space-y-2 overflow-y-auto flex-1 max-h-[300px] pr-1">
                            {isLoadingPayments ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <span className="material-symbols-outlined text-2xl animate-spin text-indigo-500">sync</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">Cargando pagos...</span>
                                </div>
                            ) : paymentsHistory.length === 0 ? (
                                <div className="py-8 text-center p-4 border border-dashed border-border rounded-2xl text-muted-foreground space-y-1">
                                    <span className="material-symbols-outlined text-3xl opacity-50">payments</span>
                                    <p className="text-xs font-bold">No hay pagos o abonos registrados para esta orden.</p>
                                    <p className="text-[10px] opacity-70">Los abonos registrados en mostrador aparecerán aquí.</p>
                                </div>
                            ) : (
                                paymentsHistory.map((p, idx) => {
                                    const methodLabel =
                                        p.method === 'CASH' ? 'Efectivo' :
                                        p.method === 'CARD' ? 'Tarjeta' :
                                        p.method === 'TRANSFER' ? 'Transferencia' : (p.method || 'Pago');
                                    const dateFormatted = p.recordedAt || p.createdAt
                                        ? new Date(p.recordedAt || p.createdAt).toLocaleDateString('es-MX', {
                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                          })
                                        : 'Fecha no registrada';

                                    return (
                                        <div key={p.id || idx} className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-[18px]">paid</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-black text-sm text-foreground">
                                                            ${Number(p.amount || 0).toLocaleString()} MXN
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-foreground">
                                                            {methodLabel}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {dateFormatted} {p.reference ? `• Ref: ${p.reference}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="pt-2 border-t border-border flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsPaymentsHistoryOpen(false)}
                                className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default QRScannerModal;
