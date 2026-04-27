const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "mysql://root:Frida.3136@46.224.155.43:3307/luxury_os"
        }
    }
});

async function main() {
    const tickets = await prisma.queueTicket.findMany({
        where: {
            OR: [
                { customerName: { contains: "Francisco" } },
                { customerPhone: { contains: "5216442221844" } }
            ]
        }
    });
    console.log(JSON.stringify(tickets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
