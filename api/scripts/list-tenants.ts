import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                    clients: true,
                    orders: true,
                }
            }
        }
    });

    console.log('--- Current Tenants ---');
    console.table(tenants.map(t => ({
        ID: t.id,
        Name: t.name,
        Users: t._count.users,
        Clients: t._count.clients,
        Orders: t._count.orders,
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
