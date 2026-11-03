import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRScannerModal from './orders/QRScannerModal';
import { useTheme } from '../context/ThemeContext';
import { OrdersService } from '../services/orders.service';
import { NotificationsService } from '../services/notifications.service';
import { formatOrderCode } from '../pages/Orders';

interface HeaderProps {
    onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
    const navigate = useNavigate();
    const { mode, toggleMode } = useTheme();
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [orderNotifications, setNotifications] = useState<any[]>([]);
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [headerSearch, setHeaderSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [whatsappAlert, setWhatsappAlert] = useState<any | null>(null);
    // La alerta de WhatsApp sin conexión va siempre primero
    const notifications = whatsappAlert ? [whatsappAlert, ...orderNotifications] : orderNotifications;

    const notifRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || user.email || 'Usuario';
    const userEmail = user.email || '';
    const userRole = String(user.role || '').toUpperCase();
    const atelierSettings = JSON.parse(localStorage.getItem('atelier_settings') || '{}');
    const atelierName = (atelierSettings.name || 'CARED').toUpperCase();

    // Close popovers on click outside or escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsNotificationsOpen(false);
                setIsUserMenuOpen(false);
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Load active notifications and all orders for global search
    useEffect(() => {
        let isMounted = true;
        OrdersService.getOrders().then((orders: any[]) => {
            if (!isMounted || !Array.isArray(orders)) return;
            setAllOrders(orders);
            const alerts: any[] = [];
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            orders.forEach((o: any) => {
                const code = o.orderCode || formatOrderCode(o);
                const isUrgent = (o.priority || '').toUpperCase() === 'ALTA';
                const dueDate = o.dueDate ? new Date(o.dueDate) : null;
                const isDueToday = dueDate && dueDate.toISOString().split('T')[0] === todayStr;
                const isOverdue = dueDate && dueDate < now && !['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(o.status);
                const isReady = ['READY_FOR_PICKUP', 'REPAIR_COMPLETED', 'TERMINADO', 'LISTO'].includes(o.status);

                if (isOverdue) {
                    alerts.push({
                        id: `overdue-${o.id}`,
                        orderId: o.id,
                        title: `Pedido retrasado #${code}`,
                        description: `${o.pieceType || 'Pieza'} de ${o.client?.name || o.clientName || 'Cliente'} venció entrega.`,
                        type: 'danger',
                        icon: 'warning',
                        time: 'Retrasado'
                    });
                } else if (isDueToday) {
                    alerts.push({
                        id: `due-${o.id}`,
                        orderId: o.id,
                        title: `Entrega para hoy #${code}`,
                        description: `${o.pieceType || 'Pieza'} de ${o.client?.name || o.clientName || 'Cliente'} para hoy.`,
                        type: 'warning',
                        icon: 'schedule',
                        time: 'Hoy'
                    });
                } else if (isUrgent) {
                    alerts.push({
                        id: `urgent-${o.id}`,
                        orderId: o.id,
                        title: `Prioridad Alta ⚡ #${code}`,
                        description: `${o.pieceType || 'Pieza'} de ${o.client?.name || o.clientName || 'Cliente'} urgente.`,
                        type: 'urgent',
                        icon: 'bolt',
                        time: 'Urgente'
                    });
                } else if (isReady) {
                    alerts.push({
                        id: `ready-${o.id}`,
                        orderId: o.id,
                        title: `Listo para entrega #${code}`,
                        description: `${o.pieceType || 'Pieza'} esperando retiro por cliente.`,
                        type: 'success',
                        icon: 'verified',
                        time: 'Listo'
                    });
                }
            });

            setNotifications(alerts.slice(0, 8));
        }).catch(() => {});
        return () => { isMounted = false; };
    }, []);

    // Avisa si el sistema de notificaciones (WhatsApp) no tiene conexión
    useEffect(() => {
        let isMounted = true;
        const checkWhatsApp = () => {
            NotificationsService.getWhatsAppStatus().then((status) => {
                if (!isMounted) return;
                if (status.connected) {
                    setWhatsappAlert(null);
                    return;
                }
                setWhatsappAlert({
                    id: 'whatsapp-disconnected',
                    href: '/settings/integrations',
                    title: 'WhatsApp sin conexión',
                    description: `No se pudieron enviar ${status.failedCount} notificación(es) a clientes. Vuelve a vincular el número en PitayaCore.`,
                    type: 'danger',
                    icon: 'wifi_off',
                    time: 'Sin conexión'
                });
            }).catch(() => {});
        };
        checkWhatsApp();
        const interval = setInterval(checkWhatsApp, 2 * 60 * 1000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const normalizeSearchText = (text: string) =>
        (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    const getTypeInfo = (type: string) => {
        const t = (type || '').toUpperCase();
        if (t === 'REPAIR') return { label: 'Reparación', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
        if (t === 'MANUFACTURE') return { label: 'Fabricación', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
        if (t === 'DESIGN') return { label: 'Diseño', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' };
        if (t === 'LASER') return { label: 'Láser', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' };
        if (t === 'LAYAWAY') return { label: 'Apartado', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
        return { label: 'Pedido', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
    };

    const getStatusInfo = (status: string) => {
        const s = (status || '').toUpperCase();
        if (['DELIVERED', 'ENTREGADO', 'ENTREGADO_POSTVENTA'].includes(s)) {
            return { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
        }
        if (['READY_FOR_PICKUP', 'REPAIR_COMPLETED', 'TERMINADO', 'LISTO'].includes(s)) {
            return { label: 'Terminado', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
        }
        if (['IN_REPAIR', 'IN_PRODUCTION', 'IN_WORKSHOP', 'TALLER', 'EN_PRODUCCION', 'EN_PROCESO'].includes(s)) {
            return { label: 'En Taller', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
        }
        return { label: 'Recibido', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
    };

    const matchingOrders = React.useMemo(() => {
        if (!headerSearch.trim()) return [];
        const q = normalizeSearchText(headerSearch);
        const qClean = q.replace(/[^a-z0-9]/g, '');

        return allOrders.filter(o => {
            const code = normalizeSearchText(o.orderCode || formatOrderCode(o) || '');
            const codeClean = code.replace(/[^a-z0-9]/g, '');
            const clientName = normalizeSearchText(o.client?.name || o.clientName || '');
            const clientPhone = (o.client?.phone || o.clientPhone || '').replace(/\D/g, '');
            const item = normalizeSearchText(o.pieceType || o.item || '');
            const notes = normalizeSearchText(o.notes || o.description || '');
            const specItems = (o.specifications?.items || []).map((it: any) =>
                normalizeSearchText(`${it.item || ''} ${it.metal || ''} ${it.notes || ''} ${it.description || ''}`)
            ).join(' ');

            if (code.includes(q) || clientName.includes(q) || item.includes(q) || specItems.includes(q) || notes.includes(q)) {
                return true;
            }

            if (qClean && (codeClean.includes(qClean) || qClean.includes(codeClean))) {
                return true;
            }

            if (qClean.length >= 3 && clientPhone.includes(qClean)) {
                return true;
            }

            const num = q.replace(/[^0-9]/g, '');
            if (num) {
                const codeNum = code.replace(/[^0-9]/g, '');
                if (codeNum === num) return true;
            }

            return false;
        }).slice(0, 8);
    }, [allOrders, headerSearch]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = headerSearch.trim();
            if (!trimmed) return;

            if (matchingOrders.length === 1) {
                navigate(`/orders/${matchingOrders[0].id}`);
                setIsSearchOpen(false);
                setHeaderSearch('');
            } else if (matchingOrders.length > 0) {
                const targetType = matchingOrders[0].type || 'REPAIR';
                navigate(`/orders?type=${targetType}&q=${encodeURIComponent(trimmed)}`);
                setIsSearchOpen(false);
            } else {
                navigate(`/orders?q=${encodeURIComponent(trimmed)}`);
                setIsSearchOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsSearchOpen(false);
        }
    };

    const formatRoleName = (role: string) => {
        if (role.includes('ADMIN')) return 'Administrador';
        if (role.includes('JOYER')) return 'Joyero';
        if (role.includes('VEND')) return 'Ventas';
        if (role.includes('DISEN') || role.includes('DESIGN')) return 'Diseñador';
        return role || 'Usuario';
    };

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-header/80 backdrop-blur-xl px-2.5 sm:px-8 gap-1 sm:gap-4 transition-colors">
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <button
                    onClick={onToggleMenu}
                    title="Alternar Menú Lateral"
                    className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm active:scale-95 border border-border/50 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">menu</span>
                </button>
                <Link to="/orders?type=REPAIR" className="flex items-center self-center pl-1 sm:pl-2 pr-1.5 sm:pr-3 cursor-pointer" aria-label={atelierName}>
                    {/* Logo corporativo (blanco): en temas claros se invierte a negro */}
                    <img
                        src="/cared-logo.png"
                        alt={atelierName}
                        width={655}
                        height={310}
                        className="h-8 sm:h-11 w-auto select-none invert dark:invert-0"
                        draggable={false}
                    />
                </Link>
            </div>

            {/* Global Search (Accesible en iPad, iPhone, Laptop y Desktop) */}
            <div className="relative flex-1 min-w-[100px] max-w-md mx-1 sm:mx-4 lg:mx-8" ref={searchRef}>
                <div className="relative group">
                    <span className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">search</span>
                    </span>
                    <input
                        value={headerSearch}
                        onChange={(e) => {
                            setHeaderSearch(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => {
                            if (allOrders.length === 0) {
                                OrdersService.getOrders().then((ords: any[]) => {
                                    if (Array.isArray(ords)) setAllOrders(ords);
                                }).catch(() => {});
                            }
                            if (headerSearch.trim()) setIsSearchOpen(true);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full rounded-2xl border border-border/60 bg-muted/40 py-2 sm:py-2.5 pl-9 sm:pl-11 pr-8 sm:pr-9 text-xs font-bold text-foreground placeholder-muted-foreground/70 focus:border-indigo-500 focus:bg-background focus:outline-none transition-all shadow-inner"
                        placeholder="Buscar por orden, cliente o joya..."
                        type="text"
                    />
                    {headerSearch && (
                        <button
                            type="button"
                            onClick={() => {
                                setHeaderSearch('');
                                setIsSearchOpen(false);
                            }}
                            className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            title="Limpiar búsqueda"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    )}
                </div>

                {/* Dropdown Live Results: ancho completo en móvil (fixed), relativo en desktop */}
                {isSearchOpen && headerSearch.trim().length > 0 && (
                    <div className="fixed left-3 right-3 top-[76px] sm:absolute sm:top-auto sm:left-0 sm:right-0 sm:w-full mt-2 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            <span>Coincidencias ({matchingOrders.length})</span>
                            <span className="text-[9px] text-muted-foreground/70 hidden sm:inline">Enter para abrir</span>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto no-scrollbar py-1 space-y-1">
                            {matchingOrders.length > 0 ? (
                                matchingOrders.map((o) => {
                                    const code = o.orderCode || formatOrderCode(o);
                                    const typeInfo = getTypeInfo(o.type);
                                    const statusInfo = getStatusInfo(o.status || o.stage);
                                    const clientName = o.client?.name || o.clientName || 'Cliente';
                                    const piece = o.pieceType || o.item || o.specifications?.items?.[0]?.item || 'Pieza';

                                    return (
                                        <button
                                            key={o.id}
                                            type="button"
                                            onClick={() => {
                                                navigate(`/orders/${o.id}`);
                                                setIsSearchOpen(false);
                                                setHeaderSearch('');
                                            }}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex flex-col items-start gap-1 shrink-0">
                                                    <span className="font-mono text-xs font-black text-foreground group-hover:text-indigo-500 transition-colors">
                                                        #{code}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">
                                                        {clientName}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {piece}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                                {o.createdAt && (
                                                    <span className="text-[9px] text-muted-foreground">
                                                        {new Date(o.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center text-muted-foreground">
                                    <span className="material-symbols-outlined text-2xl text-muted-foreground/60 mb-1">search_off</span>
                                    <p className="text-xs font-bold text-foreground">No se encontraron pedidos</p>
                                    <p className="text-[11px] mt-0.5">Verifica el código (ej. REP-7) o nombre del cliente.</p>
                                </div>
                            )}
                        </div>

                        {matchingOrders.length > 0 && (
                            <div className="pt-1.5 mt-1 border-t border-border/50 px-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const targetType = matchingOrders[0]?.type || 'REPAIR';
                                        navigate(`/orders?type=${targetType}&q=${encodeURIComponent(headerSearch.trim())}`);
                                        setIsSearchOpen(false);
                                    }}
                                    className="w-full text-center py-2 text-[11px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
                                >
                                    Ver todos los resultados en el tablero →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-auto">
                <button
                    onClick={() => setIsQRScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20 shrink-0 cursor-pointer"
                    title="Lector QR / Código de Barras para iPad"
                >
                    <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                    <span className="hidden sm:inline">Lector QR</span>
                </button>

                <div className="flex items-center gap-2 mr-2">
                    {/* Notifications Button & Dropdown */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => {
                                setIsNotificationsOpen(prev => !prev);
                                setIsUserMenuOpen(false);
                            }}
                            className={`relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                                isNotificationsOpen 
                                    ? 'bg-indigo-500/20 text-indigo-500' 
                                    : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                            }`}
                            title="Notificaciones y Alertas del Taller"
                        >
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                            {notifications.length > 0 && (
                                <span className="absolute right-2 top-2 size-2 rounded-full bg-indigo-500 border-2 border-background shadow-sm animate-pulse"></span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {isNotificationsOpen && (
                            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-card border border-border shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60 px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-wider text-foreground">Notificaciones</span>
                                        {notifications.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                {notifications.length}
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => { setNotifications([]); setWhatsappAlert(null); }}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        Limpiar
                                    </button>
                                </div>

                                <div className="max-h-[360px] overflow-y-auto no-scrollbar space-y-2">
                                    {notifications.length > 0 ? (
                                        notifications.map((n) => (
                                            <button
                                                key={n.id}
                                                onClick={() => {
                                                    setIsNotificationsOpen(false);
                                                    navigate(n.orderId ? `/orders/${n.orderId}` : n.href);
                                                }}
                                                className="w-full text-left p-3 rounded-2xl hover:bg-muted/60 border border-transparent hover:border-border transition-all flex items-start gap-3 cursor-pointer group"
                                            >
                                                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                                    n.type === 'danger'
                                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                        : n.type === 'warning'
                                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                        : n.type === 'urgent'
                                                        ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors truncate">
                                                            {n.title}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                                                            {n.time}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                                        {n.description}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center">
                                            <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                                                <span className="material-symbols-outlined text-xl">check_circle</span>
                                            </div>
                                            <p className="text-xs font-bold text-foreground">Todo al día en el taller</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">No hay alertas ni pedidos urgentes pendientes.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 mt-2 border-t border-border/60">
                                    <Link
                                        to="/orders"
                                        onClick={() => setIsNotificationsOpen(false)}
                                        className="block text-center py-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
                                    >
                                        Ver todos los pedidos →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link to="/messages" className="flex size-10 items-center justify-center rounded-xl hover:bg-muted/60 text-yellow-500 hover:text-yellow-400 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[22px] icon-fill">mail</span>
                    </Link>
                </div>

                <div className="h-8 w-px bg-border/60 mx-1 hidden md:block"></div>

                {/* User Profile Avatar & Dropdown */}
                <div className="relative pl-1" ref={userMenuRef}>
                    <button
                        onClick={() => {
                            setIsUserMenuOpen(prev => !prev);
                            setIsNotificationsOpen(false);
                        }}
                        className="flex items-center gap-3 cursor-pointer group focus:outline-none"
                    >
                        <div className="flex flex-col items-end hidden lg:flex text-right">
                            <span className="text-foreground text-xs font-black tracking-tight leading-none uppercase group-hover:text-indigo-500 transition-colors">{userName}</span>
                            <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider mt-0.5">{formatRoleName(userRole)}</span>
                        </div>
                        <div className="relative">
                            <div className="size-10 rounded-full border-2 border-border group-hover:border-indigo-500 transition-all overflow-hidden p-0.5 bg-muted shadow-inner flex items-center justify-center font-black text-xs text-indigo-500 uppercase">
                                {userName.substring(0, 2)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-background rounded-full shadow-lg"></div>
                        </div>
                    </button>

                    {/* User Profile Dropdown Menu */}
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-card border border-border shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                            {/* Profile Header Card */}
                            <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center font-black text-sm uppercase shrink-0">
                                        {userName.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-foreground uppercase truncate">{userName}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{userEmail || 'usuario@cared.mx'}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                            {formatRoleName(userRole)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Options */}
                            <div className="space-y-1">
                                <Link
                                    to="/orders"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/70 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">diamond</span>
                                    <span>Pedidos del Atelier</span>
                                </Link>

                                {userRole.includes('ADMIN') && (
                                    <Link
                                        to="/settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/70 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-muted-foreground">settings</span>
                                        <span>Configuración</span>
                                    </Link>
                                )}

                                <button
                                    onClick={() => {
                                        toggleMode();
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                                            {mode === 'dark' ? 'dark_mode' : 'light_mode'}
                                        </span>
                                        <span>Modo {mode === 'dark' ? 'Oscuro' : 'Claro'}</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                        {mode === 'dark' ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>

                            <div className="pt-2 mt-2 border-t border-border/60">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <QRScannerModal
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
            />
        </header>
    );
};

export default Header;
