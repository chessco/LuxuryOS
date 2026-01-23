import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const orders = await prisma.order.findMany({ take: 1 });
        console.log('Successfully fetched orders:', orders.length);
    } catch (err) {
        console.error('Error connecting to DB:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
