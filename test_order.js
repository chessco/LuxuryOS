const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to DB...');
        const client = await prisma.client.findFirst();
        if (!client) {
            console.error('No clients found!');
            return;
        }
        console.log('Found Client:', JSON.stringify(client, null, 2));

        const tenantId = client.tenantId;
        console.log('Using TenantID:', tenantId);

        console.log('Creating Order...');
        const order = await prisma.order.create({
            data: {
                tenantId: tenantId,
                clientId: client.id,
                pieceType: 'Test Ring Node',
                value: 1200,
                cost: 600,
                margin: 600,
                stage: 'INTERES_LEAD',
                priority: 'MEDIA'
            }
        });
        console.log('Order created successfully:', JSON.stringify(order, null, 2));

    } catch (e) {
        console.error('Error creating order:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
