const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Actualizando admin@pitayacode.io a admin@cared.mx ---');
    
    const existing = await prisma.user.findUnique({
        where: { email: 'admin@pitayacode.io' }
    });

    if (existing) {
        const updated = await prisma.user.update({
            where: { email: 'admin@pitayacode.io' },
            data: { email: 'admin@cared.mx' }
        });
        console.log(`✓ Usuario actualizado de admin@pitayacode.io a: ${updated.email}`);
    } else {
        const caredAdmin = await prisma.user.findUnique({
            where: { email: 'admin@cared.mx' }
        });
        if (caredAdmin) {
            console.log(`✓ El usuario admin@cared.mx ya existe (ID: ${caredAdmin.id})`);
        } else {
            console.log('! No se encontró admin@pitayacode.io ni admin@cared.mx');
        }
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
