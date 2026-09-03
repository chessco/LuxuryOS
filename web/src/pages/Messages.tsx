import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatService } from '../services/chat.service';
import { socketService } from '../services/socket.service';
import { UsersService } from '../services/users.service';
import { ClientsService } from '../services/clients.service';

export const Messages: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'internal' | 'whatsapp'>('internal');

    // --- Internal Team Chat State ---
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // New Internal Chat Modal
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    // --- WhatsApp Customer Chat State ---
    const [waConversations, setWaConversations] = useState<any[]>([]);
    const [selectedWaPhone, setSelectedWaPhone] = useState<string | null>(null);
    const [waMessages, setWaMessages] = useState<any[]>([]);
    const [newWaMessage, setNewWaMessage] = useState('');
    const [isWaLoading, setIsWaLoading] = useState(false);
    const [waSearchQuery, setWaSearchQuery] = useState('');
    const waScrollRef = useRef<HTMLDivElement>(null);

    // New WhatsApp Chat Modal
    const [isNewWaChatOpen, setIsNewWaChatOpen] = useState(false);
    const [availableClients, setAvailableClients] = useState<any[]>([]);
    const [customWaPhone, setCustomWaPhone] = useState('');

    const selectedIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);

        loadConversations();
        loadWaConversations();
        socketService.connect();

        socketService.onNewMessage((msg) => {
            if (msg.conversationId === selectedIdRef.current) {
                setMessages(prev => [...prev, msg]);
            }
            setConversations(prev => prev.map(conv =>
                conv.id === msg.conversationId
                    ? { ...conv, messages: [msg], updatedAt: msg.createdAt }
                    : conv
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        });
    }, []);

    useEffect(() => {
        if (selectedId && activeTab === 'internal') {
            loadMessages(selectedId);
            socketService.joinRoom(selectedId);
        }
        return () => {
            if (selectedId && activeTab === 'internal') socketService.leaveRoom(selectedId);
        };
    }, [selectedId, activeTab]);

    useEffect(() => {
        if (selectedWaPhone && activeTab === 'whatsapp') {
            loadWaMessages(selectedWaPhone);
        }
    }, [selectedWaPhone, activeTab]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (waScrollRef.current) {
            waScrollRef.current.scrollTop = waScrollRef.current.scrollHeight;
        }
    }, [waMessages]);

    // --- Data Loaders ---
    const loadConversations = async () => {
        try {
            const data = await ChatService.getConversations();
            setConversations(data);
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to load internal conversations", error);
        }
    };

    const loadMessages = async (id: string) => {
        try {
            const data = await ChatService.getMessages(id);
            setMessages(data);
        } catch (error) {
            console.error("Failed to load internal messages", error);
        }
    };

    const loadWaConversations = async () => {
        setIsWaLoading(true);
        try {
            const data = await ChatService.getWhatsAppConversations();
            setWaConversations(data);
            if (data.length > 0 && !selectedWaPhone) {
                setSelectedWaPhone(data[0].cleanPhone);
            }
        } catch (error) {
            console.error("Failed to load WhatsApp conversations", error);
        } finally {
            setIsWaLoading(false);
        }
    };

    const loadWaMessages = async (phone: string) => {
        try {
            const data = await ChatService.getWhatsAppMessages(phone);
            setWaMessages(data);
        } catch (error) {
            console.error("Failed to load WhatsApp messages", error);
        }
    };

    // --- Action Handlers ---
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedId || !currentUser) return;

        socketService.sendMessage({
            conversationId: selectedId,
            senderId: currentUser.id,
            content: newMessage
        });

        setNewMessage('');
    };

    const handleSendWaMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWaMessage.trim() || !selectedWaPhone) return;

        const content = newWaMessage.trim();
        setNewWaMessage('');

        const targetConv = waConversations.find(c => c.cleanPhone === selectedWaPhone);

        // Optimistic UI push
        const tempMsg = {
            id: `temp-${Date.now()}`,
            content,
            direction: 'OUTBOUND',
            status: 'SENT',
            createdAt: new Date().toISOString()
        };
        setWaMessages(prev => [...prev, tempMsg]);

        try {
            await ChatService.sendWhatsAppMessage(selectedWaPhone, content, targetConv?.clientName);
            // Refresh conversation list timestamp
            setWaConversations(prev => prev.map(c =>
                c.cleanPhone === selectedWaPhone
                    ? { ...c, lastMessage: content, updatedAt: new Date().toISOString() }
                    : c
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (error) {
            console.error("Failed to send WhatsApp message", error);
            alert("No se pudo enviar el mensaje por WhatsApp.");
        }
    };

    const handleOpenNewChat = async () => {
        setIsNewChatOpen(true);
        try {
            const users = await UsersService.getAll();
            setAvailableUsers(users.filter((u: any) => u.id !== currentUser?.id));
        } catch (error) {
            console.error("Failed to load users", error);
        }
    };

    const handleStartConversation = async (userId: string) => {
        try {
            const conversation = await ChatService.findOrCreateConversation(userId);
            setConversations(prev => {
                const exists = prev.find(c => c.id === conversation.id);
                if (exists) return prev;
                return [conversation, ...prev];
            });
            setSelectedId(conversation.id);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error("Failed to create conversation", error);
        }
    };

    const handleOpenNewWaChat = async () => {
        setIsNewWaChatOpen(true);
        try {
            const clients = await ClientsService.getAll();
            setAvailableClients(clients);
        } catch (error) {
            console.error("Failed to load clients", error);
        }
    };

    const handleSelectClientForWa = (client: any) => {
        const phone = client.phone ? client.phone.replace(/\D/g, '') : '';
        if (!phone) {
            alert('El cliente no tiene un teléfono registrado.');
            return;
        }
        const cleanPhone = phone.length === 10 ? `52${phone}` : phone;
        const formattedPhone = cleanPhone.length === 12 && cleanPhone.startsWith('52')
            ? `+52 ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5, 8)} ${cleanPhone.substring(8)}`
            : `+${cleanPhone}`;

        // Ensure in list
        const exists = waConversations.find(c => c.cleanPhone === cleanPhone);
        if (!exists) {
            const newConv = {
                id: cleanPhone,
                cleanPhone,
                formattedPhone,
                clientName: client.name.toUpperCase(),
                lastMessage: 'Sin mensajes',
                updatedAt: new Date().toISOString(),
                unread: 0
            };
            setWaConversations(prev => [newConv, ...prev]);
        }

        setSelectedWaPhone(cleanPhone);
        setIsNewWaChatOpen(false);
    };

    const handleStartCustomWaPhone = () => {
        if (!customWaPhone.trim()) return;
        const cleanPhone = customWaPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            alert('Por favor ingresa un número de teléfono válido (10 dígitos).');
            return;
        }
        const fullClean = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
        const formattedPhone = `+${fullClean}`;

        const exists = waConversations.find(c => c.cleanPhone === fullClean);
        if (!exists) {
            const newConv = {
                id: fullClean,
                cleanPhone: fullClean,
                formattedPhone,
                clientName: `CLIENTE (+${fullClean})`,
                lastMessage: 'Nuevo chat WhatsApp',
                updatedAt: new Date().toISOString(),
                unread: 0
            };
            setWaConversations(prev => [newConv, ...prev]);
        }

        setSelectedWaPhone(fullClean);
        setIsNewWaChatOpen(false);
        setCustomWaPhone('');
    };

    // Filter WhatsApp conversations
    const filteredWaConversations = waConversations.filter(c => {
        if (!waSearchQuery.trim()) return true;
        const query = waSearchQuery.toLowerCase();
        return c.clientName.toLowerCase().includes(query) ||
            c.formattedPhone.toLowerCase().includes(query) ||
            c.cleanPhone.includes(query);
    });

    const selectedConv = conversations.find(c => c.id === selectedId);
    const otherUser = selectedConv?.users.find((u: any) => u.id !== currentUser?.id);
    const selectedWaConv = waConversations.find(c => c.cleanPhone === selectedWaPhone);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4 antialiased">
            {/* Navigation Tabs Header */}
            <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-2xl w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('internal')}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'internal'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    <span>Mensajes Internos</span>
                </button>

                <button
                    onClick={() => {
                        setActiveTab('whatsapp');
                        loadWaConversations();
                    }}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
                        activeTab === 'whatsapp'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px] text-emerald-400">chat</span>
                    <span>Clientes (WhatsApp)</span>
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping"></span>
                </button>
            </div>

            {/* TAB 1: INTERNAL TEAM MESSAGES */}
            {activeTab === 'internal' && (
                <div className="flex flex-1 gap-6 overflow-hidden">
                    {/* Sidebar: Internal Conversations */}
                    <div className="w-80 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Mensajes</h2>
                                <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mt-1">Chat de Atelier</p>
                            </div>
                            <button
                                onClick={handleOpenNewChat}
                                className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                                title="Nuevo Mensaje Interno"
                            >
                                <span className="material-symbols-outlined text-xl">edit_square</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                            {isLoading ? (
                                <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Cargando...</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Sin conversaciones</div>
                            ) : (
                                conversations.map((conv) => {
                                    const partner = conv.users.find((u: any) => u.id !== currentUser?.id) || conv.users[0];
                                    const partnerName = partner?.name || partner?.email || 'Usuario';
                                    const partnerInitial = partnerName.substring(0, 2).toUpperCase();

                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setSelectedId(conv.id)}
                                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${selectedId === conv.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                                        >
                                            <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedId === conv.id ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground border border-border'}`}>
                                                {partnerInitial}
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className={`font-bold text-sm truncate ${selectedId === conv.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                        {partnerName}
                                                    </span>
                                                    <span className="text-[9px] font-black opacity-40">
                                                        {conv.messages?.[0] ? new Date(conv.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className={`text-[10px] truncate font-medium tracking-tight ${selectedId === conv.id ? 'opacity-80' : 'opacity-60'}`}>
                                                    {conv.messages?.[0]?.content || 'Sin mensajes aún'}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                        {selectedId ? (
                            <>
                                <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/20">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xl shadow-black/5 dark:shadow-white/5">
                                            {(otherUser?.name || otherUser?.email || '??').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-foreground font-bold text-lg">{otherUser?.name || otherUser?.email || 'Cargando...'}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                <span className="text-muted-foreground text-[9px] font-black uppercase tracking-widest">En línea</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar bg-muted/10 transition-colors">
                                    {messages.map((msg) => {
                                        const isMe = msg.senderId === currentUser?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className="max-w-[70%] group relative">
                                                    <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm dark:shadow-xl ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background text-foreground rounded-tl-none border border-border'}`}>
                                                        {msg.content}
                                                        <div className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-40 text-right">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-8 border-t border-border bg-muted/20">
                                    <div className="relative flex items-center gap-4">
                                        <input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Escribe un mensaje interno..."
                                            className="flex-1 bg-background border border-border rounded-2xl py-4 px-6 text-sm text-foreground focus:border-primary outline-none transition-all shadow-sm"
                                        />
                                        <button
                                            type="submit"
                                            className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                            disabled={!newMessage.trim()}
                                        >
                                            <span className="material-symbols-outlined">send</span>
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                <div className="size-24 rounded-[32px] bg-muted border border-border flex items-center justify-center mb-6 shadow-sm">
                                    <span className="material-symbols-outlined text-muted-foreground text-5xl">chat_bubble</span>
                                </div>
                                <h3 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Tus Conversaciones Internas</h3>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-xs mt-4">
                                    Selecciona un chat para comenzar a comunicarte con el equipo en tiempo real.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: WHATSAPP CUSTOMER MESSAGES */}
            {activeTab === 'whatsapp' && (
                <div className="flex flex-1 gap-6 overflow-hidden">
                    {/* Sidebar: WhatsApp Client List */}
                    <div className="w-80 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                        <div className="p-6 border-b border-border space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-foreground text-xl font-black uppercase tracking-widest font-display flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-500 text-2xl">chat</span>
                                        WhatsApp
                                    </h2>
                                    <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest mt-0.5">Mensajería PitayaCore</p>
                                </div>
                                <button
                                    onClick={handleOpenNewWaChat}
                                    className="size-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                                    title="Nuevo Chat WhatsApp"
                                >
                                    <span className="material-symbols-outlined text-xl">add_comment</span>
                                </button>
                            </div>

                            {/* WhatsApp Search Bar */}
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">search</span>
                                <input
                                    type="text"
                                    value={waSearchQuery}
                                    onChange={(e) => setWaSearchQuery(e.target.value)}
                                    placeholder="Buscar cliente o celular..."
                                    className="w-full bg-input border border-border rounded-xl py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* WhatsApp Conversations List */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                            {isWaLoading ? (
                                <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Cargando chats...</div>
                            ) : filteredWaConversations.length === 0 ? (
                                <div className="p-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] font-black uppercase">Sin conversaciones de WhatsApp</div>
                            ) : (
                                filteredWaConversations.map((conv) => {
                                    const isSelected = selectedWaPhone === conv.cleanPhone;
                                    const partnerInitial = conv.clientName.substring(0, 2).toUpperCase();

                                    return (
                                        <button
                                            key={conv.cleanPhone}
                                            onClick={() => setSelectedWaPhone(conv.cleanPhone)}
                                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${isSelected ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-muted text-muted-foreground'}`}
                                        >
                                            <div className={`size-11 rounded-2xl flex items-center justify-center font-black text-xs relative shrink-0 ${isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                                                {partnerInitial}
                                                <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] ring-2 ring-card">
                                                    <span className="material-symbols-outlined text-[10px]">chat</span>
                                                </span>
                                            </div>

                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    {/* IDENTIFICADOR: Nombre del Cliente */}
                                                    <span className={`font-black text-xs uppercase truncate ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                                        {conv.clientName}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-emerald-100' : 'opacity-40'}`}>
                                                        {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>

                                                <p className={`text-[10px] font-bold tracking-wider mb-1 ${isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    📱 {conv.formattedPhone}
                                                </p>

                                                <p className={`text-[10px] truncate font-medium ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                                                    {conv.lastMessage?.replace(/https?:\/\/[^\s]+/g, '📷 [Código]').trim()}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* WhatsApp Chat Main Window */}
                    <div className="flex-1 flex flex-col bg-card border border-border rounded-[32px] overflow-hidden backdrop-blur-sm shadow-sm transition-colors">
                        {selectedWaConv ? (
                            <>
                                {/* Header */}
                                <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-emerald-950/10 border-l-4 border-l-emerald-500">
                                    <div className="flex items-center gap-4">
                                        <div className="size-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                                            {selectedWaConv.clientName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-foreground font-black text-base uppercase tracking-tight">{selectedWaConv.clientName}</h3>
                                            
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider">
                                                    Transmisión WhatsApp: <span className="font-mono">{selectedWaConv.formattedPhone}</span>
                                                </span>
                                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                                            Canal PitayaCore WA
                                        </div>
                                    </div>
                                </div>

                                {/* Messages History */}
                                <div ref={waScrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar bg-zinc-950/20 transition-colors">
                                    {waMessages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">chat_bubble_outline</span>
                                            <p className="text-xs font-bold uppercase tracking-widest">Inicia la conversación por WhatsApp con {selectedWaConv.clientName}</p>
                                        </div>
                                    ) : (
                                        waMessages.map((msg) => {
                                            const isOutbound = msg.direction === 'OUTBOUND';
                                            const imgMatch = msg.content?.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp)|https?:\/\/bwipjs-api[^\s]+|https?:\/\/api\.qrserver[^\s]+)/i);
                                            const mediaUrl = imgMatch ? imgMatch[0] : null;
                                            const textBody = mediaUrl ? msg.content.replace(mediaUrl, '').replace(/\n{3,}/g, '\n\n').trim() : msg.content;

                                            return (
                                                <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                    <div className="max-w-[75%] group relative">
                                                        <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-md ${
                                                            isOutbound
                                                                ? 'bg-emerald-600 text-white rounded-tr-none'
                                                                : 'bg-background text-foreground rounded-tl-none border border-border'
                                                        }`}>
                                                            {mediaUrl && (
                                                                <div className="mb-3 p-2 bg-white rounded-xl flex items-center justify-center max-w-[260px] shadow-sm border border-black/10">
                                                                    <img 
                                                                        src={mediaUrl} 
                                                                        alt="Código de Orden" 
                                                                        className="max-h-40 max-w-full object-contain rounded"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="whitespace-pre-wrap leading-relaxed">{textBody}</div>
                                                            <div className={`text-[8px] font-black uppercase tracking-tighter mt-1.5 flex items-center justify-end gap-1 ${
                                                                isOutbound ? 'text-emerald-100' : 'text-muted-foreground'
                                                            }`}>
                                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {isOutbound && <span className="material-symbols-outlined text-[12px]">done_all</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Input Bar */}
                                <form onSubmit={handleSendWaMessage} className="p-6 border-t border-border bg-muted/20">
                                    <div className="relative flex items-center gap-4">
                                        <input
                                            value={newWaMessage}
                                            onChange={(e) => setNewWaMessage(e.target.value)}
                                            placeholder={`Enviar WhatsApp a ${selectedWaConv.clientName}...`}
                                            className="flex-1 bg-background border border-border rounded-2xl py-4 px-6 text-sm text-foreground focus:border-emerald-500 outline-none transition-all shadow-sm"
                                        />
                                        <button
                                            type="submit"
                                            className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                            disabled={!newWaMessage.trim()}
                                        >
                                            <span>Enviar</span>
                                            <span className="material-symbols-outlined text-base">send</span>
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                <div className="size-24 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6 shadow-sm">
                                    <span className="material-symbols-outlined text-5xl">chat</span>
                                </div>
                                <h3 className="text-foreground text-xl font-black uppercase tracking-widest font-display">Mensajería WhatsApp de Clientes</h3>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-xs mt-4">
                                    Selecciona un cliente de la lista para ver el historial o transmitir mensajes en tiempo real vía PitayaCore.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: New Internal Chat */}
            <AnimatePresence>
                {isNewChatOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsNewChatOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 m-auto w-full max-w-md h-fit max-h-[80vh] bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                                <h3 className="text-foreground font-black uppercase tracking-widest">Nuevo Mensaje Interno</h3>
                                <button onClick={() => setIsNewChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Seleccionar Integrante</p>
                                <div className="space-y-2">
                                    {availableUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleStartConversation(user.id)}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors text-left group border border-transparent hover:border-border/50"
                                        >
                                            <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                {user.name?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <h4 className="text-foreground font-bold text-sm">{user.name}</h4>
                                                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">{user.role}</p>
                                            </div>
                                            <span className="material-symbols-outlined ml-auto text-muted-foreground/30 group-hover:text-indigo-500 transition-colors">send</span>
                                        </button>
                                    ))}
                                    {availableUsers.length === 0 && (
                                        <p className="text-center text-muted-foreground text-xs py-8">No hay otros usuarios disponibles.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modal: New WhatsApp Chat */}
            <AnimatePresence>
                {isNewWaChatOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsNewWaChatOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[85vh] bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-emerald-950/20">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">chat</span>
                                    <h3 className="text-foreground font-black uppercase tracking-widest text-sm">Nuevo Chat WhatsApp</h3>
                                </div>
                                <button onClick={() => setIsNewWaChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* Custom Phone Entry */}
                                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                        Escribir número directo (10 dígitos)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={customWaPhone}
                                            onChange={(e) => setCustomWaPhone(e.target.value)}
                                            placeholder="ej. 6441732208"
                                            className="flex-1 bg-background border border-border rounded-xl py-2.5 px-4 text-xs text-foreground outline-none focus:border-emerald-500 transition-all font-mono"
                                        />
                                        <button
                                            onClick={handleStartCustomWaPhone}
                                            disabled={!customWaPhone.trim()}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                        >
                                            Abrir Chat
                                        </button>
                                    </div>
                                </div>

                                {/* Select from Registered Clients */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">
                                        O seleccionar de la lista de clientes registrados
                                    </p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {availableClients.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => handleSelectClientForWa(client)}
                                                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-all text-left border border-border/40 hover:border-emerald-500/50 group"
                                            >
                                                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="text-foreground font-black text-xs uppercase truncate">{client.name}</h4>
                                                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider mt-0.5">
                                                        📱 {client.phone || 'Sin número'}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-muted-foreground/30 group-hover:text-emerald-500 transition-colors">send</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Messages;
