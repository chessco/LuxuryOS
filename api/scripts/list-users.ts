import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: {
            tenant: {
                select: {
                    name: true
                }
            }
        }
    });

    if (users.length === 0) {
        console.log('No users found in the database.');
        return;
    }

    console.table(users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        tenant: u.tenant?.name || 'N/A',
        createdAt: u.createdAt
    })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
