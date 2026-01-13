import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@pitayacode.io' },
        include: { tenant: true }
    });

    if (user) {
        console.log(`User ${user.email} is assigned to tenant: ${user.tenant.name} (${user.tenant.id})`);
        console.log(`Role: ${user.role}`);
    } else {
        console.log('User not found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
