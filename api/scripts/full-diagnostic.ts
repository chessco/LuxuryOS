import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants.`);
    tenants.forEach(t => console.log(`  - Tenant: ${t.name} (ID: ${t.id})`));

    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);
    users.forEach(u => console.log(`  - User: ${u.email} (TenantID: ${u.tenantId}) (Role: ${u.role})`));

    const orders = await prisma.order.findMany();
    console.log(`Found ${orders.length} orders total.`);

    const tenantsWithOrders = new Set(orders.map(o => o.tenantId));
    console.log(`Orders belong to ${tenantsWithOrders.size} different tenants.`);
    tenantsWithOrders.forEach(tid => {
        const count = orders.filter(o => o.tenantId === tid).length;
        console.log(`  - Tenant ID ${tid} has ${count} orders.`);
    });

    const categoriesCount = await prisma.order.groupBy({
        by: ['stage'],
        _count: { _all: true }
    });
    console.log('Orders per stage (global):', categoriesCount);

    console.log('--- DIAGNOSTIC END ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
