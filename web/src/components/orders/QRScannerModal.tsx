import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { OrdersService } from '../../services/orders.service';
import { PaymentModal } from './PaymentModal';
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

    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [foundOrder, setFoundOrder] = useState<any | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

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
        const trimmed = raw.trim();
        // Check for URL track link: https://.../track/{token}
        const trackMatch = trimmed.match(/\/track\/([a-zA-Z0-9_-]+)/);
        if (trackMatch) return trackMatch[1];
        // Check for standard code like REP-28, FAB-12, etc.
        const codeMatch = trimmed.match(/([A-Z]{3}-\d+)/i);
        if (codeMatch) return codeMatch[1].toUpperCase();
        return trimmed;
    };

    const fetchOrderByCode = async (rawCode: string) => {
        const clean = parseScannedCode(rawCode);
        if (!clean) return;

        setIsLoadingOrder(true);
        setActionMessage(null);
        try {
            const order = await OrdersService.getOrder(clean);
            if (order && order.id) {
                playBeep();
                setFoundOrder(order);
                stopCamera();
            } else {
                alert(`No se encontró ningún pedido con el código: ${clean}`);
            }
        } catch (err) {
            console.error('Error fetching order from QR:', err);
            alert(`No se encontró pedido con el código: ${clean}`);
        } finally {
            setIsLoadingOrder(false);
        }
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
                            fetchOrderByCode(code);
                            return;
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
                                fetchOrderByCode(code.data);
                                return;
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
        setManualCode('');
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

    const handleRegisterPayment = async (amount: number, method: string) => {
        if (!foundOrder) return;
        await OrdersService.registerPayment(foundOrder.id, amount, method);
        setActionMessage(`¡Pago de $${amount.toLocaleString()} MXN registrado con éxito! 💳`);
        const updated = await OrdersService.getOrder(foundOrder.id);
        setFoundOrder(updated);
        if (onOrderUpdated) onOrderUpdated();
    };

    if (!isOpen) return null;

    const totalAmount = Number(foundOrder?.totalAmount || foundOrder?.value || 0);
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

                                {/* Order Summary Card */}
                                <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                                            {orderCode}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-foreground">
                                            {getStatusLabel(foundOrder.status || foundOrder.stage)}
                                        </span>
                                    </div>
                                    <div className="text-sm font-black uppercase tracking-tight text-foreground truncate">
                                        {clientName}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium">
                                        {pieceName} • Total: ${totalAmount.toLocaleString()} MXN
                                        {pendingAmount > 0 ? (
                                            <span className="text-amber-500 font-bold ml-1.5">(Pendiente: ${pendingAmount.toLocaleString()} MXN)</span>
                                        ) : (
                                            <span className="text-emerald-500 font-bold ml-1.5">(Liquidado)</span>
                                        )}
                                    </div>
                                </div>

                                {/* Role Specific Action Buttons */}
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                                        {isJoyero ? 'Acciones para Joyero' : 'Acciones para Ventas'}
                                    </div>

                                    {!isJoyero ? (
                                        /* Ventas / Admin Actions: Cobrar y Mandar al Taller */
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsPaymentOpen(true)}
                                                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-2xl">payments</span>
                                                <span>Cobrar</span>
                                                <span className="text-[9px] font-medium opacity-80">Registrar Pago</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(
                                                    foundOrder.type === 'MANUFACTURE' ? 'IN_PRODUCTION' : 'IN_REPAIR',
                                                    'En Taller'
                                                )}
                                                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-2xl">construction</span>
                                                <span>Mandar al Taller</span>
                                                <span className="text-[9px] font-medium opacity-80">Estado: En Taller</span>
                                            </button>
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

                                    {/* Auxiliary Actions: Ver Orden & Escanear Otra */}
                                    <div className="flex gap-2 pt-2">
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
                    onRegisterPayment={handleRegisterPayment}
                />
            )}
        </AnimatePresence>,
        document.body
    );
};

export default QRScannerModal;
