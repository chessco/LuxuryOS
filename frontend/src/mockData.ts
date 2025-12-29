export interface ItemMock {
    id: string;
    sku: string;
    name: string;
    detail: string;
    type: string;
    location: string;
    quantity: number;
    value: string;
    cost: string;
    icon: string;
    color?: string;
    alert?: boolean;
}

export const MOCK_INVENTORY_DATA: Record<string, ItemMock> = {
    "1": { id: '1', sku: 'DIA-0042-X', name: 'Solitario Diamante Corte Brillante', detail: '2.05 Carat, VVS1', type: 'Anillos', location: 'Bóveda Principal', quantity: 3, value: '$12,500', cost: '$7,200', icon: 'diamond', color: 'text-zinc-400' },
    "2": { id: '2', sku: 'WAT-8821-V', name: 'Cronógrafo Vintage 1960', detail: 'Restaurado', type: 'Relojería', location: 'Vitrina 1', quantity: 1, value: '$8,500', cost: '$5,100', icon: 'watch', color: 'text-zinc-400', alert: true },
    "3": { id: '3', sku: 'NEC-9002-C', name: 'Collar Esmeralda Colombiana', detail: 'Oro Blanco 18k', type: 'Collares', location: 'Taller (Engaste)', quantity: 2, value: '$24,000', cost: '$14,000', icon: 'apparel', color: 'text-zinc-400' },
    "4": { id: '4', sku: 'GEM-3321-S', name: 'Zafiros Sueltos (Lote A)', detail: 'Corte Oval', type: 'Gemas', location: 'Caja Fuerte 2', quantity: 50, value: '$450', cost: '$250', icon: 'hexagon', color: 'text-zinc-400' },
};

export interface ClientMock {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'Active' | 'Inactive' | 'VIP';
    totalSpent: string;
    lastOrder: string;
    tags: string[];
    avatar?: string;
    initials?: string;
    initialsColor?: string;
    notes?: string;
}

export const MOCK_CLIENTS_DATA: Record<string, ClientMock> = {
    "1": {
        id: "1",
        name: "Sofía Martínez",
        email: "sofia.mtz@example.com",
        phone: "+52 55 1234 5678",
        status: "VIP",
        totalSpent: "450,000 MXN",
        lastOrder: "24 Dic 2023",
        tags: ["Anillos", "Diamantes"],
        initials: "SM",
        initialsColor: "bg-purple-900 text-purple-300"
    },
    "2": {
        id: "2",
        name: "Roberto Gomez",
        email: "roberto.g@example.com",
        phone: "+52 33 9876 5432",
        status: "Active",
        totalSpent: "165,000 MXN",
        lastOrder: "15 Dic 2023",
        tags: ["Relojes"],
        initials: "RG",
        initialsColor: "bg-blue-900 text-blue-300"
    },
    "3": {
        id: "3",
        name: "Diego Alvarez",
        email: "diego.alvarez@example.com",
        phone: "+52 81 2468 1357",
        status: "VIP",
        totalSpent: "1,250,000 MXN",
        lastOrder: "12 Oct 2023",
        tags: ["Alta Joyería", "Coleccionista"],
        initials: "DA",
        initialsColor: "bg-amber-900 text-amber-300"
    },
    "4": {
        id: "4",
        name: "Valeria S.",
        email: "valeria.s@example.com",
        phone: "+52 55 5555 5555",
        status: "Active",
        totalSpent: "125,000 MXN",
        lastOrder: "05 Nov 2023",
        tags: ["Zafiros"],
        initials: "VS",
        initialsColor: "bg-pink-900 text-pink-300"
    }
} as any;

export interface OrderMock {
    id: string;
    client: string;
    item: string;
    value: string;
    cost: string;
    margin: string;
    status: string;
    statusType: 'new' | 'urgent' | 'success' | 'normal';
    date: string;
    priority: string;
    material: string;
    gem: string;
    size: string;
    engraving: string;
    avatar?: string;
    initials?: string;
    initialsColor?: string;
    progress?: number;
    paymentProgress: number;
    paidAmount: string;
    pendingAmount: string;
    isPaid?: boolean;
}

export const MOCK_ORDERS: Record<string, OrderMock> = {
    "8902": {
        id: "8902",
        client: "Sofía Martínez",
        item: "Solitario Diamante 2ct",
        value: "95,000 MXN",
        cost: "45,000 MXN",
        margin: "52%",
        status: "Nuevo",
        statusType: "new",
        date: "24 Dic 2023",
        priority: "Normal",
        material: "Oro Blanco 18k",
        gem: "Diamante 2.0ct, VS1, F",
        size: "50 EU",
        engraving: "S & R",
        initials: "SM",
        initialsColor: "bg-zinc-800 text-zinc-400",
        paymentProgress: 20,
        paidAmount: "19,000 MXN",
        pendingAmount: "76,000 MXN",
    },
    "8903": {
        id: "8903",
        client: "Roberto Gomez",
        item: "Reloj Vintage",
        value: "165,000 MXN",
        cost: "90,000 MXN",
        margin: "45%",
        status: "Pendiente",
        statusType: "normal",
        date: "15 Dic 2023",
        priority: "Normal",
        material: "Acero Inoxidable",
        gem: "N/A",
        size: "42mm",
        engraving: "Classic 1970",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCoUHjghtrVs3O9E1cIXxAPRQ7GhHfAhHH4CrjmluogcV7IC6XgtSk7lcVxiSnpFMeSvZartTrJcZgk9Ld532ZJNuXTwDpE-5_TvAwplOiGmDP4UPXcx-Bb5qtCEiIy3Wi1qBZMhrUOKt-Uehf8JhkvQxYjfSlrrDzXCHYVvq4GY7GPT6HWn3NLmfrdkIRfoxwvlG_VM-97evfJ30crX2Qaq8x75caC5gyW_EO2qPWqKuziIE_ie_ALET0vkfpnlf4MS5lw03rCmFg",
        paymentProgress: 100,
        paidAmount: "165,000 MXN",
        pendingAmount: "0 MXN",
        isPaid: true
    },
    "7829": {
        id: "7829",
        client: "Diego Alvarez",
        item: "Collar Tennis 10ct",
        value: "850,000 MXN",
        cost: "420,000 MXN",
        margin: "51%",
        status: "Urgente",
        statusType: "urgent",
        date: "12 Oct 2023",
        priority: "Prioridad Alta",
        material: "Oro Blanco 18k",
        gem: "Diamantes 10ct Totales",
        size: "42 cm",
        engraving: "D.A. Excellence",
        initials: "DA",
        initialsColor: "bg-indigo-950 text-indigo-400",
        progress: 65,
        paymentProgress: 50,
        paidAmount: "425,000 MXN",
        pendingAmount: "425,000 MXN",
        isPaid: true
    },
    "7835": {
        id: "7835",
        client: "Valeria S.",
        item: "Anillo Zafiro Rosa",
        value: "125,000 MXN",
        cost: "60,000 MXN",
        margin: "52%",
        status: "Listo",
        statusType: "success",
        date: "05 Nov 2023",
        priority: "Normal",
        material: "Oro Rosa 18k",
        gem: "Zafiro Rosa 1.5ct",
        size: "52 EU",
        engraving: "Valeria",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUbztMJQn-5cC_9xLtb_12n0svWtfoU084RVCdiDr_Mtj2XKj_7uvtMyO2gurhuNi6Nc1Cnjt35jv7hp5bxeFyCq_yWZVqRcF-MS_VYxpl6vFmXaxQTeD0O6R4XkSus6xar9jSxlGciThC9W6wFBHN2AVR3forL1OWNsZSGdtWe9KTzzghlWPb4ByW9tORwUZJzNctrFeGrb_yZEuXOmiLVaTvIaMjvqUPtuH2Fd8zvQ1DQHzhB9efFeqxQwEUvLXlngrBlV2OHXg",
        paymentProgress: 100,
        paidAmount: "125,000 MXN",
        pendingAmount: "0 MXN",
        isPaid: true
    }
};

export const MOCK_CLIENTS = [
    "Sofía Martínez",
    "Roberto Gomez",
    "Diego Alvarez",
    "Valeria S.",
    "Carlos Slim",
    "Maria Felix",
    "Salma Hayek",
    "Luis Miguel",
    "Frida Kahlo",
    "Guillermo del Toro",
    "Alejandro G. Iñárritu",
    "Alfonso Cuarón",
    "Thalía",
    "Paulina Rubio",
    "Gael García Bernal",
    "Diego Luna",
    "Eiza González",
    "Yalitza Aparicio",
    "Kate del Castillo",
    "Eugenio Derbez"
];

export const MOCK_ITEMS = [
    "Solitario Diamante 2ct",
    "Reloj Vintage",
    "Collar Tennis 10ct",
    "Anillo Zafiro Rosa",
    "Brazalete Oro 18k",
    "Aretes Perlas Tahití",
    "Anillo Compromiso Clasico",
    "Dije Cruz Diamantes",
    "Esclava Plata .925",
    "Gargantilla Rubí",
    "Anillo Esmeralda Colombiana",
    "Broche Art Deco",
    "Mancuernillas Oro",
    "Reloj Deportivo Titanio",
    "Cadena Cubana Oro",
    "Anillo Promesa",
    "Churumbela Diamantes",
    "Pulsera Tenis Zafiros",
    "Medalla San Benito",
    "Argollas Matrimonio Platino"
];
