import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Create Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Luxury OS Demo – LUXE Atelier',
        },
    });

    // 2. Create User
    const passwordHash = await bcrypt.hash('luxury123', 10);
    const user = await prisma.user.create({
        data: {
            email: 'admin@luxuryos.com',
            passwordHash,
            tenantId: tenant.id,
        },
    });

    console.log('User created:', user.email);

    // 3. Create Clients
    const clientNames = [
        'Sofía Villalobos',
        'Eduardo Mondragón',
        'Araceli Ruiz',
        'Constanza de la Vega',
        'Mauricio Garcíadiego',
    ];

    const clients = await Promise.all(
        clientNames.map((name) =>
            prisma.client.create({
                data: {
                    name,
                    email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`,
                    tenantId: tenant.id,
                },
            }),
        ),
    );

    console.log('Clients created:', clients.length);

    // 4. Create Orders
    const ordersData = [
        {
            pieceType: 'Anillo de Compromiso Diamante 2ct',
            stage: 'INTERES_LEAD',
            value: 150000,
            cost: 95000,
            margin: 55000,
            priority: 'ALTA',
            paymentStatus: 'PENDIENTE',
        },
        {
            pieceType: 'Brazalete de Oro Blanco y Esmeraldas',
            stage: 'COTIZACION_ENVIADA',
            value: 85000,
            cost: 42000,
            margin: 43000,
            priority: 'MEDIA',
            paymentStatus: 'PENDIENTE',
        },
        {
            pieceType: 'Gargantilla de Perlas Australianas',
            stage: 'APROBADO_ANTICIPO',
            value: 45000,
            cost: 20000,
            margin: 25000,
            priority: 'BAJA',
            paymentStatus: 'PARCIAL',
        },
        {
            pieceType: 'Aretes de Zafiro y Platino',
            stage: 'EN_PRODUCCION',
            value: 120000,
            cost: 70000,
            margin: 50000,
            priority: 'ALTA',
            paymentStatus: 'PAGADO',
        },
        {
            pieceType: 'Reloj de Lujo Personalizado',
            stage: 'CONTROL_CALIDAD',
            value: 350000,
            cost: 210000,
            margin: 140000,
            priority: 'ALTA',
            paymentStatus: 'PAGADO',
        },
        {
            pieceType: 'Dije de Rubí en Oro Rosa',
            stage: 'LISTO_ENTREGA',
            value: 32000,
            cost: 15000,
            margin: 17000,
            priority: 'MEDIA',
            paymentStatus: 'PAGADO',
        },
        {
            pieceType: 'Argollas de Matrimonio Clásicas',
            stage: 'ENTREGADO_POSTVENTA',
            value: 25000,
            cost: 12000,
            margin: 13000,
            priority: 'BAJA',
            paymentStatus: 'PAGADO',
        },
        {
            pieceType: 'Tiarra de Cristales Swarovski',
            stage: 'EN_PRODUCCION',
            value: 12000,
            cost: 5000,
            margin: 7000,
            priority: 'BAJA',
            paymentStatus: 'PARCIAL',
        },
        {
            pieceType: 'Anillo de Graduación Oro 14k',
            stage: 'INTERES_LEAD',
            value: 18000,
            cost: 8000,
            margin: 10000,
            priority: 'MEDIA',
            paymentStatus: 'PENDIENTE',
        },
        {
            pieceType: 'Gemelos de Plata Grabados',
            stage: 'COTIZACION_ENVIADA',
            value: 5000,
            cost: 1500,
            margin: 3500,
            priority: 'BAJA',
            paymentStatus: 'PENDIENTE',
        },
    ];

    for (let i = 0; i < ordersData.length; i++) {
        await prisma.order.create({
            data: {
                ...ordersData[i],
                tenantId: tenant.id,
                clientId: clients[i % clients.length].id,
            },
        });
    }

    console.log('Orders created:', ordersData.length);
    console.log('Seed finished successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
