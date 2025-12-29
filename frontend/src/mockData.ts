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
