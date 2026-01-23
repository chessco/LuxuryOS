import { PrismaClient, OrderStage, Priority, PaymentStatus, Role, OrderType, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 0. Clear existing data
    console.log('Clearing existing data...');
    await prisma.order.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // 1. Create Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Luxury OS Demo – LUXE Atelier',
        },
    });

    // 2. Create Users with Roles
    const passwordHash = await bcrypt.hash('pitaya123', 10);

    // System Admin
    await prisma.user.create({
        data: {
            email: 'system@pitayacode.io',
            passwordHash,
            tenantId: tenant.id,
            role: 'SYSTEM_ADMIN',
        },
    });

    // Tenant Admin
    await prisma.user.create({
        data: {
            email: 'admin@pitayacode.io',
            passwordHash,
            tenantId: tenant.id,
            role: 'TENANT_ADMIN',
        },
    });

    // Tenant User
    const user = await prisma.user.create({
        data: {
            email: 'tenant.user@pitayacode.io',
            passwordHash,
            tenantId: tenant.id,
            role: 'TENANT_USER',
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
    const ordersData: any[] = [
        {
            pieceType: 'Anillo de Compromiso Diamante 2ct',
            stage: OrderStage.INTERES_LEAD,
            value: 150000,
            cost: 95000,
            margin: 55000,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PENDIENTE,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        },
        {
            pieceType: 'Brazalete de Oro Blanco y Esmeraldas',
            stage: OrderStage.COTIZACION_ENVIADA,
            value: 85000,
            cost: 42000,
            margin: 43000,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PENDIENTE,
        },
        {
            pieceType: 'Gargantilla de Perlas Australianas',
            stage: OrderStage.APROBADO_ANTICIPO,
            value: 45000,
            cost: 20000,
            margin: 25000,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PARCIAL,
        },
        {
            pieceType: 'Aretes de Zafiro y Platino',
            stage: OrderStage.EN_PRODUCCION,
            value: 120000,
            cost: 70000,
            margin: 50000,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PAGADO,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        },
        {
            pieceType: 'Reloj de Lujo Personalizado',
            stage: OrderStage.CONTROL_CALIDAD,
            value: 350000,
            cost: 210000,
            margin: 140000,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PAGADO,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        },
        {
            pieceType: 'Dije de Rubí en Oro Rosa',
            stage: OrderStage.LISTO_ENTREGA,
            value: 32000,
            cost: 15000,
            margin: 17000,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PAGADO,
        },
        {
            pieceType: 'Argollas de Matrimonio Clásicas',
            stage: OrderStage.ENTREGADO_POSTVENTA,
            value: 25000,
            cost: 12000,
            margin: 13000,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PAGADO,
        },
        {
            pieceType: 'Tiarra de Cristales Swarovski',
            stage: OrderStage.EN_PRODUCCION,
            value: 12000,
            cost: 5000,
            margin: 7000,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PARCIAL,
        },
        {
            pieceType: 'Anillo de Graduación Oro 14k',
            stage: OrderStage.INTERES_LEAD,
            value: 18000,
            cost: 8000,
            margin: 10000,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PENDIENTE,
        },
        {
            pieceType: 'Gemelos de Plata Grabados',
            stage: OrderStage.COTIZACION_ENVIADA,
            value: 5000,
            cost: 1500,
            margin: 3500,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PENDIENTE,
        },
        // Ciudad Obregón Localized Repairs
        {
            pieceType: 'Ajuste de Anillo (Oro 14k)',
            type: OrderType.REPAIR,
            status: OrderStatus.IN_REPAIR,
            stage: OrderStage.EN_PRODUCCION,
            value: 1200,
            cost: 400,
            margin: 800,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PENDIENTE,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
            notes: 'Cliente de Valle del Yaqui. Ajustar de talla 6 a 7.',
        },
        {
            pieceType: 'Soldadura de Cadena de Oro',
            type: OrderType.REPAIR,
            status: OrderStatus.RECEIVED,
            stage: OrderStage.INTERES_LEAD,
            value: 800,
            cost: 200,
            margin: 600,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PENDIENTE,
            notes: 'Urgente para evento en Itson. Soldadura láser requerida.',
        },
        {
            pieceType: 'Limpieza y Pulido Profundo',
            type: OrderType.REPAIR,
            status: OrderStatus.REPAIR_COMPLETED,
            stage: OrderStage.LISTO_ENTREGA,
            value: 600,
            cost: 100,
            margin: 500,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PAGADO,
            notes: 'Mantenimiento preventivo. Recoger en sucursal Centro.',
        },
        {
            pieceType: 'Engaste de Diamante Suelto',
            type: OrderType.REPAIR,
            status: OrderStatus.DIAGNOSIS_PENDING,
            stage: OrderStage.INTERES_LEAD,
            value: 2500,
            cost: 800,
            margin: 1700,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PENDIENTE,
            notes: 'Revisar uñas de la montura. Cliente referido de Navojoa.',
        },
        // Manufacture Seeds
        {
            pieceType: 'Anillo de Graduación Personalizado',
            type: OrderType.MANUFACTURE,
            status: OrderStatus.SPEC_PENDING,
            stage: OrderStage.INTERES_LEAD,
            value: 12000,
            cost: 5000,
            margin: 7000,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PENDIENTE,
            notes: 'Diseño 3D pendiente por aprobación del cliente.',
            imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=2070&auto=format&fit=crop',
        },
        {
            pieceType: 'Brazalete con Nombre Calado',
            type: OrderType.MANUFACTURE,
            status: OrderStatus.MATERIALS_PENDING,
            stage: OrderStage.APROBADO_ANTICIPO,
            value: 8500,
            cost: 3200,
            margin: 5300,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PARCIAL,
            notes: 'Esperando arribo de lámina de oro de 14k.',
            imageUrl: 'https://images.unsplash.com/photo-1573408302382-99d3581836fd?q=80&w=2070&auto=format&fit=crop',
        },
        {
            pieceType: 'Collar de Diseño Orgánico',
            type: OrderType.MANUFACTURE,
            status: OrderStatus.IN_PRODUCTION,
            stage: OrderStage.EN_PRODUCCION,
            value: 25000,
            cost: 11000,
            margin: 14000,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PARCIAL,
            notes: 'Fase de fundición completada. Iniciando pulido.',
            imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?q=80&w=1974&auto=format&fit=crop',
        },
        // Layaway Seeds
        {
            pieceType: 'Reloj Omega Seamaster (Semi-nuevo)',
            type: OrderType.LAYAWAY,
            status: OrderStatus.LAYAWAY_OPEN,
            stage: OrderStage.APROBADO_ANTICIPO,
            value: 125000,
            cost: 85000,
            margin: 40000,
            priority: Priority.MEDIA,
            paymentStatus: PaymentStatus.PARCIAL,
            notes: 'Plan de 6 meses. Pago mensual requerido cada día 15.',
            imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop',
        },
        {
            pieceType: 'Cadena de Eslabones Gruesos 100gr',
            type: OrderType.LAYAWAY,
            status: OrderStatus.LAYAWAY_OPEN,
            stage: OrderStage.APROBADO_ANTICIPO,
            value: 95000,
            cost: 72000,
            margin: 23000,
            priority: Priority.BAJA,
            paymentStatus: PaymentStatus.PARCIAL,
            notes: 'Apartado por 3 meses. Ubicación en bóveda: Cajón 12.',
            imageUrl: 'https://images.unsplash.com/photo-1598560945594-123fb7703042?q=80&w=1974&auto=format&fit=crop',
        },
        {
            pieceType: 'Set de Diamantes para Aretes',
            type: OrderType.LAYAWAY,
            status: OrderStatus.LAYAWAY_EXPIRED,
            stage: OrderStage.INTERES_LEAD,
            value: 45000,
            cost: 30000,
            margin: 15000,
            priority: Priority.ALTA,
            paymentStatus: PaymentStatus.PARCIAL,
            notes: 'Apartado vencido. Contactar cliente para prórroga.',
            imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1974&auto=format&fit=crop',
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
