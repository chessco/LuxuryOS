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
}

export const PublicOrderTrack: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [initialLoading, setInitialLoading] = useState(true);
    const [orderCode, setOrderCode] = useState<string>('');
    const [orderExists, setOrderExists] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Verification state
    const [phoneDigits, setPhoneDigits] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderTrackData | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

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
                    setTimeout(() => inputRef.current?.focus(), 150);
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
        if (phoneDigits.length < 4) {
            setVerifyError('Por favor ingresa los 4 dígitos completos.');
            return;
        }

        try {
            setVerifying(true);
            setVerifyError(null);
            const res = await axios.post(`${API_URL}/public/orders/track/${id}/verify`, {
                phoneDigits: phoneDigits.trim()
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

    return (
        <div className="theme-cared dark min-h-screen bg-cared-bg text-cared-ink flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-cared-gold selection:text-black">
            {/* Header / Brand */}
            <header className="w-full max-w-lg flex flex-col items-center justify-center pt-6 pb-8">
                <h1>
                    <img
                        src="/cared-logo.png"
                        alt="CARED"
                        width={655}
                        height={310}
                        className="h-24 sm:h-28 w-auto select-none"
                        draggable={false}
                    />
                </h1>
            </header>

            {/* Main Content Area */}
            <main className="w-full max-w-lg my-auto py-8">
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
                    <div className="bg-cared-card/70 border border-cared-line rounded-3xl p-8 sm:p-10 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
                        <div className="size-14 rounded-2xl bg-cared-gold/10 border border-cared-gold/20 flex items-center justify-center mx-auto mb-4 text-cared-gold shadow-[0_0_20px_rgba(201,162,75,0.15)]">
                            <span className="material-symbols-outlined text-3xl">lock</span>
                        </div>

                        <h2 className="text-base font-black uppercase tracking-wider text-cared-ink mb-2">
                            Verificación de Seguridad
                        </h2>
                        <p className="text-xs text-cared-mute leading-relaxed max-w-xs mx-auto mb-6">
                            Para consultar el seguimiento en línea, ingrese los <strong className="text-cared-ink">últimos 4 dígitos</strong> de su número de teléfono registrado.
                        </p>

                        <form onSubmit={handleVerify} className="space-y-6">
                            <div>
                                <input
                                    ref={inputRef}
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    value={phoneDigits}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPhoneDigits(val);
                                        if (verifyError) setVerifyError(null);
                                    }}
                                    placeholder="••••"
                                    className="w-48 mx-auto text-center tracking-[0.6em] text-3xl font-black py-3 px-4 bg-cared-bg border border-cared-line focus:border-cared-gold rounded-2xl outline-none text-cared-gold transition-all shadow-inner"
                                    autoFocus
                                />
                            </div>

                            {verifyError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-in fade-in">
                                    {verifyError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={verifying || phoneDigits.length < 4}
                                className="w-full py-3.5 px-6 rounded-2xl bg-cared-red text-white font-black text-xs uppercase tracking-widest hover:bg-cared-red/85 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-cared-red/20 flex items-center justify-center gap-2"
                            >
                                {verifying ? (
                                    <>
                                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                        <span>Verificando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Consultar Pedido</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Verified Order Workflow Stepper */
                    <div className="bg-cared-card/60 border border-cared-line rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Order Summary Pill */}
                        <div className="p-6 sm:p-8 border-b border-cared-line/80 bg-cared-card/40">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cared-gold">
                                    {order.concept}
                                </span>
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-widest bg-cared-red border border-cared-red text-white">
                                    {order.orderCode}
                                </span>
                            </div>

                            {order.pieces && order.pieces.length > 1 ? (
                                <ul className="space-y-1 mb-2">
                                    {order.pieces.map((piece, idx) => (
                                        <li key={idx} className="flex items-baseline gap-3 text-2xl font-black text-cared-ink uppercase tracking-tight">
                                            <span className="text-[11px] font-mono font-black text-cared-gold tracking-widest">{String(idx + 1).padStart(2, '0')}</span>
                                            <span>{piece}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <h2 className="text-2xl font-black text-cared-ink uppercase tracking-tight mb-2">
                                    {order.pieces?.[0] || order.pieceType}
                                </h2>
                            )}

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cared-line/50">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cared-mute">Estado Actual:</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    order.statusLabel === 'ENTREGADO'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : (order.statusLabel === 'LISTO' || order.statusLabel === 'TERMINADO')
                                        ? 'bg-cared-gold/10 text-cared-gold border-cared-gold/30'
                                        : order.statusLabel === 'EN TALLER'
                                        ? 'bg-cared-gold text-black border-cared-gold font-black'
                                        : 'bg-cared-gold/10 text-cared-gold border-cared-gold/30'
                                }`}>
                                    {order.statusLabel}
                                </span>
                            </div>
                        </div>

                        {/* Progress Stepper Timeline */}
                        <div className="p-6 sm:p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-cared-mute mb-6">
                                Seguimiento del Flujo
                            </h3>

                            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-cared-line">
                                {order.steps.map((step, idx) => {
                                    const isDone = step.isCompleted;
                                    const isCurrent = step.isCurrent;

                                    return (
                                        <div key={idx} className="relative flex items-start gap-4">
                                            {/* Bullet icon indicator */}
                                            <div className={`absolute -left-6 top-0.5 size-6 rounded-full flex items-center justify-center text-xs transition-all ${
                                                isCurrent
                                                    ? 'bg-cared-gold text-black shadow-[0_0_15px_rgba(201,162,75,0.6)] ring-4 ring-cared-gold/20 font-black'
                                                    : isDone
                                                    ? 'bg-emerald-500 text-black font-black'
                                                    : 'bg-cared-line text-cared-mute border border-cared-line'
                                            }`}>
                                                {isDone && !isCurrent ? (
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[14px]">{step.icon}</span>
                                                )}
                                            </div>

                                            {/* Step Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-xs font-black uppercase tracking-wider ${
                                                        isCurrent ? 'text-cared-gold' : isDone ? 'text-cared-ink' : 'text-cared-mute'
                                                    }`}>
                                                        {step.label}
                                                    </h4>
                                                    {step.date && (
                                                        <span className="text-[10px] font-mono text-cared-mute">
                                                            {step.date}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-cared-mute leading-normal mt-1">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            <span className="text-[11px] font-mono font-black tracking-widest text-cared-gold">
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
            <footer className="w-full max-w-lg text-center pt-6 border-t border-cared-line/80">
                <p className="text-[10px] font-bold text-cared-mute uppercase tracking-widest">
                    LuxuryOS &copy; {new Date().getFullYear()} &bull; Todos los derechos reservados
                </p>
            </footer>
        </div>
    );
};

export default PublicOrderTrack;
