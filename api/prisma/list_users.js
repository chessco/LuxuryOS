const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
    });
    console.table(users);
}

main().finally(() => prisma.$disconnect());
