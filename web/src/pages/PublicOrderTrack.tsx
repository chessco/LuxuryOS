import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luxury-api.pitayacode.io';

interface Step {
    id: string;
    label: string;
    description: string;
    icon: string;
    isCompleted: boolean;
    isCurrent: boolean;
    date: string | null;
}

interface OrderTrackData {
    orderCode: string;
    concept: string;
    pieceType: string;
    pieces?: string[];
    statusLabel: string;
    createdAt: string;
    deliveredAt: string | null;
    steps: Step[];
    laborCost?: number;
    materialCost?: number;
    totalAmount?: number;
    paidAmount?: number;
    balance?: number;
}

export const PublicOrderTrack: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [initialLoading, setInitialLoading] = useState(true);
    const [orderCode, setOrderCode] = useState<string>('');
    const [orderExists, setOrderExists] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Verification state
    const [phoneDigits, setPhoneDigits] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderTrackData | null>(null);

    const digitInputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        const checkOrderExists = async () => {
            if (!id) return;
            try {
                setInitialLoading(true);
                setGlobalError(null);
                const res = await axios.get(`${API_URL}/public/orders/track/${id}/check`);
                if (res.data?.exists) {
                    setOrderExists(true);
                    setOrderCode(res.data.orderCode);
                    setTimeout(() => digitInputRefs.current[0]?.focus(), 150);
                }
            } catch (err: any) {
                console.error("Order check error", err);
                setGlobalError('No pudimos encontrar la información de este pedido o el enlace es incorrecto.');
            } finally {
                setInitialLoading(false);
            }
        };

        checkOrderExists();
    }, [id]);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (phoneDigits.some((digit) => !digit)) {
            setVerifyError('Por favor ingresa los 4 dígitos completos.');
            return;
        }

        try {
            setVerifying(true);
            setVerifyError(null);
            const res = await axios.post(`${API_URL}/public/orders/track/${id}/verify`, {
                phoneDigits: phoneDigits.join('')
            });
            if (res.data?.verified) {
                setOrder(res.data);
            }
        } catch (err: any) {
            console.error("Verification error", err);
            const msg = err.response?.data?.message || 'Los 4 dígitos no coinciden con el teléfono registrado.';
            setVerifyError(msg);
        } finally {
            setVerifying(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    };

    const handleDigitChange = (index: number, value: string) => {
        const digits = value.replace(/\D/g, '');

        if (digits.length > 1) {
            const nextDigits = Array.from({ length: 4 }, (_, digitIndex) => digits[digitIndex] || '');
            setPhoneDigits(nextDigits);
            digitInputRefs.current[Math.min(digits.length, 4) - 1]?.focus();
        } else {
            setPhoneDigits((current) => {
                const next = [...current];
                next[index] = digits;
                return next;
            });

            if (digits && index < 3) {
                digitInputRefs.current[index + 1]?.focus();
            }
        }

        if (verifyError) setVerifyError(null);
    };

    const handleDigitKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !phoneDigits[index] && index > 0) {
            digitInputRefs.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            digitInputRefs.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowRight' && index < 3) {
            event.preventDefault();
            digitInputRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitsPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (!pastedDigits) return;

        event.preventDefault();
        setPhoneDigits(Array.from({ length: 4 }, (_, digitIndex) => pastedDigits[digitIndex] || ''));
        digitInputRefs.current[Math.min(pastedDigits.length, 4) - 1]?.focus();
        if (verifyError) setVerifyError(null);
    };

    const isPublicGate = !order;

    return (
        <div className={`theme-cared dark min-h-screen text-cared-ink flex flex-col items-center selection:bg-cared-red selection:text-white ${isPublicGate ? 'cared-track-gate justify-between' : 'cared-track-order'}`}>
            {/* Header / Brand */}
            <header className={isPublicGate ? 'cared-track-header' : 'cared-track-order-header'}>
                <h1>
                    <img
                        src={isPublicGate ? '/tracking/cared-logo-mark.png' : '/cared-logo.png'}
                        alt="CARED"
                        width={isPublicGate ? 4500 : 655}
                        height={isPublicGate ? 2351 : 310}
                        className={isPublicGate ? 'cared-track-logo' : 'cared-track-order-logo'}
                        draggable={false}
                    />
                </h1>
            </header>

            {/* Main Content Area */}
            <main className={isPublicGate ? 'cared-track-main' : 'cared-track-order-main'}>
                {initialLoading ? (
                    <div className="bg-cared-card/60 border border-cared-line rounded-3xl p-12 text-center backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4 animate-pulse">
                        <div className="size-10 rounded-full border-2 border-cared-gold border-t-transparent animate-spin"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-cared-mute">Verificando enlace del pedido...</p>
                    </div>
                ) : globalError || !orderExists ? (
                    <div className="bg-cared-card/60 border border-red-500/20 rounded-3xl p-10 text-center backdrop-blur-xl shadow-2xl">
                        <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error_outline</span>
                        <h2 className="text-sm font-black uppercase tracking-widest text-cared-ink mb-2">Pedido No Encontrado</h2>
                        <p className="text-xs text-cared-mute leading-relaxed max-w-xs mx-auto mb-6">{globalError || 'Verifique el código de orden ingresado.'}</p>
                        <a href="https://luxuryos.pitayacode.io" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cared-line text-xs font-black uppercase tracking-widest text-cared-ink hover:text-cared-ink border border-cared-line transition-all">
                            Ir al Inicio
                        </a>
                    </div>
                ) : !order ? (
                    /* Security Gate Verification Card */
                    <div className="cared-track-card animate-in fade-in zoom-in-95 duration-200">
                        <div className="cared-track-card-inner">
                            <div className="cared-track-kicker" aria-hidden="true">
                                <span />
                                <p>Seguimiento en línea</p>
                                <span />
                            </div>

                            <h2 className="cared-track-title">
                                Consulta el<br />estado de tu pieza
                            </h2>
                            <p className="cared-track-copy">
                                Ingresa los últimos cuatro dígitos de tu número registrado para conocer el avance de tu servicio.
                            </p>

                            <form onSubmit={handleVerify} className="cared-track-form">
                                <fieldset>
                                    <legend className="sr-only">Últimos cuatro dígitos de tu teléfono</legend>
                                    <div className="cared-track-digits">
                                        {phoneDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(element) => { digitInputRefs.current[index] = element; }}
                                                type="password"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(event) => handleDigitChange(index, event.target.value)}
                                                onKeyDown={(event) => handleDigitKeyDown(index, event)}
                                                onPaste={handleDigitsPaste}
                                                aria-label={`Dígito ${index + 1} de 4`}
                                                autoComplete="off"
                                                autoFocus={index === 0}
                                                className="cared-track-digit"
                                            />
                                        ))}
                                    </div>
                                </fieldset>

                                {verifyError && (
                                    <div className="cared-track-error animate-in fade-in" role="alert">
                                        {verifyError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={verifying || phoneDigits.some((digit) => !digit)}
                                    className="cared-track-submit"
                                >
                                    {verifying ? (
                                        <>
                                            <span className="cared-track-spinner" aria-hidden="true" />
                                            <span>Verificando</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Ver seguimiento</span>
                                            <span aria-hidden="true" className="cared-track-arrow">→</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="cared-track-card-signature" aria-hidden="true">
                                <span />
                                <img src="/tracking/cared-mark.png" alt="" draggable={false} />
                                <span />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Verified Order Workflow Stepper */
                    <div className="cared-track-order-card bg-cared-card/60 border border-cared-line rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Order Summary Pill */}
                        <div className="cared-track-order-summary p-5 sm:p-8 border-b border-cared-line/80 bg-cared-card/40">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <span className="text-xs sm:text-[11px] font-black uppercase tracking-[0.2em] text-white">
                                    {order.concept}
                                </span>
                                <span className="px-3 py-1 rounded-full text-[11px] sm:text-[10px] font-mono font-black tracking-widest bg-cared-red border border-cared-red text-white">
                                    {order.orderCode}
                                </span>
                            </div>

                            {order.pieces && order.pieces.length > 1 ? (
                                <ul className="space-y-1 mb-2">
                                    {order.pieces.map((piece, idx) => (
                                        <li key={idx} className="flex items-baseline gap-3 text-xl sm:text-2xl font-black text-cared-ink uppercase tracking-tight">
                                            <span className="text-xs sm:text-[11px] font-mono font-black text-white tracking-widest">{String(idx + 1).padStart(2, '0')}</span>
                                            <span>{piece}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <h2 className="text-xl sm:text-2xl font-black text-cared-ink uppercase tracking-tight mb-2">
                                    {order.pieces?.[0] || order.pieceType}
                                </h2>
                            )}

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cared-line/50">
                                <span className="text-[11px] sm:text-[10px] font-black uppercase tracking-widest text-cared-mute">Estado Actual:</span>
                                <span className={`px-3 py-1 rounded-full text-[11px] sm:text-[10px] font-black uppercase tracking-widest border ${
                                    order.statusLabel === 'ENTREGADO'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : order.statusLabel === 'TERMINADO'
                                        ? 'bg-black/30 text-white border-cared-red shadow-[0_0_0_1px_rgba(217,38,38,0.18)]'
                                        : order.statusLabel === 'LISTO'
                                        ? 'bg-cared-gold/10 text-white border-cared-gold/30'
                                        : order.statusLabel === 'EN TALLER'
                                        ? 'bg-cared-gold text-black border-cared-gold font-black'
                                        : 'bg-cared-gold/10 text-white border-cared-gold/30'
                                }`}>
                                    {order.statusLabel}
                                </span>
                            </div>
                        </div>

                        {/* Progress Stepper Timeline */}
                        <div className="cared-track-order-timeline p-5 sm:p-8">
                            <h3 className="text-[11px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-cared-mute mb-5 sm:mb-6">
                                Seguimiento del Flujo
                            </h3>

                            <div className="relative pl-6 space-y-6 sm:space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-cared-line">
                                {order.steps.map((step, idx) => {
                                    const isDone = step.isCompleted;
                                    const isCurrent = step.isCurrent;

                                    return (
                                        <div key={idx} className="relative flex items-start gap-4">
                                            {/* Bullet icon indicator */}
                                            <div className={`absolute -left-6 top-0.5 size-6 rounded-full flex items-center justify-center text-xs transition-all ${
                                                isDone
                                                    ? 'bg-cared-red text-white shadow-[0_0_15px_rgba(224,21,32,0.32)] ring-4 ring-cared-red/15 font-black'
                                                    : isCurrent
                                                    ? 'bg-cared-gold text-black shadow-[0_0_15px_rgba(201,162,75,0.6)] ring-4 ring-cared-gold/20 font-black'
                                                    : 'bg-cared-line text-cared-mute border border-cared-line'
                                            }`}>
                                                {isDone ? (
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[14px]">{step.icon}</span>
                                                )}
                                            </div>

                                            {/* Step Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-sm sm:text-xs font-black uppercase tracking-wider ${
                                                        isCurrent ? 'text-white' : isDone ? 'text-cared-ink' : 'text-cared-mute'
                                                    }`}>
                                                        {step.label}
                                                    </h4>
                                                    {step.date && (
                                                        <span className="text-[11px] sm:text-[10px] font-mono text-cared-mute">
                                                            {step.date}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs sm:text-[11px] text-cared-mute leading-normal mt-1">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Financial Breakdown: Mano de Obra, Material y Total Sumado */}
                        <div className="p-6 sm:p-8 border-t border-cared-line/80 bg-cared-card/30">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-cared-mute mb-4">
                                Resumen Financiero del Pedido
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-cared-mute">
                                    <span>Mano de Obra</span>
                                    <span className="font-mono font-bold text-cared-ink">
                                        {formatMoney(order.laborCost || 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-cared-mute">
                                    <span>Material</span>
                                    <span className="font-mono font-bold text-cared-ink">
                                        {formatMoney(order.materialCost || 0)}
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-cared-line/60 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-white">
                                        Total de la Orden
                                    </span>
                                    <span className="text-lg font-mono font-black text-white">
                                        {formatMoney(order.totalAmount || ((order.laborCost || 0) + (order.materialCost || 0)))}
                                    </span>
                                </div>

                                {(order.paidAmount || 0) > 0 && (
                                    <>
                                        <div className="flex items-center justify-between text-xs text-emerald-400/90 pt-1">
                                            <span>Anticipo Pagado</span>
                                            <span className="font-mono font-bold">
                                                - {formatMoney(order.paidAmount || 0)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-cared-ink pt-2 border-t border-dashed border-cared-line/40">
                                            <span>Saldo Pendiente por Liquidar</span>
                                            <span className="font-mono font-black text-amber-400 text-sm">
                                                {formatMoney(order.balance ?? Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0)))}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Digital QR Code Card */}
                        <div className="p-6 bg-cared-bg/40 border-t border-cared-line/60 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cared-mute mb-3">
                                Código QR Oficial de la Orden
                            </span>
                            <div className="p-2.5 bg-white rounded-2xl shadow-lg border border-cared-ink inline-block mb-2">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`}
                                    alt={`QR ${order.orderCode}`}
                                    className="size-36 object-contain"
                                />
                            </div>
                            <span className="text-[11px] font-mono font-black tracking-widest text-white">
                                {order.orderCode}
                            </span>
                            <p className="text-[9px] text-cared-mute mt-1 max-w-xs">
                                Presenta este código QR en sucursal al momento de recoger tu pieza.
                            </p>
                        </div>

                        {/* Footer notice inside card */}
                        <div className="p-4 bg-cared-red text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white">
                                Actualizado en tiempo real por el equipo de CARED
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Public Page Footer */}
            <footer className="cared-track-footer">
                <img src="/tracking/wolves-outline.png" alt="" draggable={false} />
                <p>Joyería · Fabricación · Reparación</p>
            </footer>
        </div>
    );
};

export default PublicOrderTrack;
