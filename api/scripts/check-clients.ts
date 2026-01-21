import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.client.count();
    const clients = await prisma.client.findMany({ take: 5 });
    console.log(`Total clients: ${count}`);
    console.log('First 5 clients:', JSON.stringify(clients, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
