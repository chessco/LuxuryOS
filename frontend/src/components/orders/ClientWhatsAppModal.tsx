import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatService } from '../../services/chat.service';
import { socketService } from '../../services/socket.service';

interface ClientWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: {
        id?: string;
        name: string;
        phone?: string;
    } | null;
    orderCode?: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const renderWithLinks = (text: string, linkClassName: string): React.ReactNode[] =>
    String(text ?? '').split(URL_REGEX).map((part, i) => {
        if (i % 2 === 0) return part;
        const trailing = part.match(/[.,;:!?)\]]+$/)?.[0] ?? '';
        const url = trailing ? part.slice(0, -trailing.length) : part;
        return (
            <React.Fragment key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>{url}</a>
                {trailing}
            </React.Fragment>
        );
    });

export const ClientWhatsAppModal: React.FC<ClientWhatsAppModalProps> = ({
    isOpen,
    onClose,
    client,
    orderCode
}) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const clientName = client?.name || 'Cliente';
    const rawPhone = client?.phone ? String(client.phone).replace(/\D/g, '') : '';
    const cleanPhone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;
    const formattedPhone = cleanPhone.length === 12 && cleanPhone.startsWith('52')
        ? `+52 ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5, 8)} ${cleanPhone.substring(8)}`
        : `+${cleanPhone}`;

    const loadMessages = async () => {
        if (!cleanPhone) return;
        try {
            const data = await ChatService.getWhatsAppMessages(cleanPhone);
            setMessages(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error cargando mensajes de WhatsApp del cliente:', error);
        }
    };

    useEffect(() => {
        if (!isOpen || !cleanPhone) return;

        setIsLoading(true);
        loadMessages().finally(() => setIsLoading(false));

        // Connect socket if not connected
        socketService.connect();

        // Polling fallback to keep conversation in sync every 4 seconds
        const interval = setInterval(() => {
            loadMessages();
        }, 4000);

        return () => {
            clearInterval(interval);
        };
    }, [isOpen, cleanPhone]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !cleanPhone || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        // Optimistic UI push
        const tempMsg = {
            id: `temp-${Date.now()}`,
            content,
            direction: 'OUTBOUND',
            status: 'SENT',
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await ChatService.sendWhatsAppMessage(cleanPhone, content, clientName);
            // Refresh real messages
            await loadMessages();
        } catch (error) {
            console.error('Error al enviar WhatsApp:', error);
            alert('No se pudo enviar el mensaje por WhatsApp. Verifica la conexión con el servidor.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    const initials = clientName.substring(0, 2).toUpperCase();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Chat Drawer / Window */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="fixed inset-y-0 right-0 z-[110] w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col transition-colors overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 sm:px-8 py-5 border-b border-border bg-emerald-950/20 flex items-center justify-between border-l-4 border-l-emerald-500">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30 shadow-inner relative">
                                    {initials}
                                    <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] ring-2 ring-card">
                                        <span className="material-symbols-outlined text-[10px]">chat</span>
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-foreground font-black text-base sm:text-lg uppercase tracking-tight">{clientName}</h3>
                                        {orderCode && (
                                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                {orderCode}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2.5 mt-0.5">
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider font-mono">
                                            {formattedPhone}
                                        </span>
                                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
                                            Canal PitayaCore WA
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {cleanPhone && (
                                    <a
                                        href={`https://wa.me/${cleanPhone}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Abrir WhatsApp Web externo"
                                        className="size-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 transition-all shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                    </a>
                                )}
                                <button
                                    onClick={onClose}
                                    title="Cerrar ventana de WhatsApp"
                                    className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Banner de Información */}
                        <div className="px-6 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                            <span>Conversación directa exclusiva de este cliente</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">Sincronizado en tiempo real</span>
                        </div>

                        {/* Messages History */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 no-scrollbar bg-zinc-950/20 transition-colors"
                        >
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                                    <span className="material-symbols-outlined animate-spin text-3xl text-emerald-500 mb-2">sync</span>
                                    <p className="text-xs font-black uppercase tracking-widest">Cargando mensajes de WhatsApp...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                                    <div className="size-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
                                    </div>
                                    <h4 className="text-foreground font-black text-sm uppercase tracking-wider mb-1">Sin mensajes previos</h4>
                                    <p className="text-xs font-medium max-w-xs text-muted-foreground">
                                        Inicia la conversación por WhatsApp con <span className="font-bold text-foreground">{clientName}</span> escribiendo un mensaje abajo.
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOutbound = msg.direction === 'OUTBOUND';
                                    const imgMatch = msg.content?.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp)|https?:\/\/bwipjs-api[^\s]+|https?:\/\/api\.qrserver[^\s]+)/i);
                                    const mediaUrl = imgMatch ? imgMatch[0] : null;
                                    const textBody = mediaUrl ? msg.content.replace(mediaUrl, '').replace(/\n{3,}/g, '\n\n').trim() : msg.content;

                                    return (
                                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[85%] sm:max-w-[75%] group relative">
                                                <div
                                                    className={`px-5 py-3.5 rounded-2xl text-sm font-medium shadow-md ${
                                                        isOutbound
                                                            ? 'bg-emerald-600 text-white rounded-tr-none'
                                                            : 'bg-background text-foreground rounded-tl-none border border-border'
                                                    }`}
                                                >
                                                    {mediaUrl && (
                                                        <div className="mb-3 p-2.5 bg-white rounded-xl flex items-center justify-center max-w-[280px] shadow-sm border border-black/10">
                                                            <img
                                                                src={mediaUrl}
                                                                alt="Código de Orden"
                                                                className="max-h-48 max-w-full object-contain rounded"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm">
                                                        {renderWithLinks(
                                                            textBody,
                                                            isOutbound
                                                                ? 'underline font-bold text-white hover:text-emerald-100'
                                                                : 'underline font-bold text-emerald-600 hover:text-emerald-500'
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`text-[8px] font-black uppercase tracking-tighter mt-1.5 flex items-center justify-end gap-1 ${
                                                            isOutbound ? 'text-emerald-100' : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        <span>
                                                            {msg.createdAt
                                                                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : ''}
                                                        </span>
                                                        {isOutbound && (
                                                            <span className="material-symbols-outlined text-[13px]">done_all</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSendMessage} className="p-4 sm:p-6 border-t border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Enviar WhatsApp a ${clientName}...`}
                                    disabled={!cleanPhone || isSending}
                                    className="flex-1 bg-input border border-border rounded-2xl py-3.5 px-5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || !cleanPhone || isSending}
                                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <span>Enviar</span>
                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
