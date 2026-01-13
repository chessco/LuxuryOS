import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany();
    console.log('Tenants:', tenants.map(t => ({ id: t.id, name: t.name })));

    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => ({ email: u.email, tenantId: u.tenantId })));

    const orders = await prisma.order.findMany();
    console.log('Total Orders:', orders.length);
    if (orders.length > 0) {
        console.log('Orders sample tenantId:', orders[0].tenantId);
    }

    const clients = await prisma.client.findMany();
    console.log('Total Clients:', clients.length);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
