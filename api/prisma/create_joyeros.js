const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Creando / actualizando usuarios joyero1, joyero2, joyero3 ---');
    
    // Obtener tenant principal
    const tenants = await prisma.tenant.findMany();
    if (tenants.length === 0) {
        throw new Error('No se encontraron tenants en la base de datos.');
    }
    const tenantId = tenants[0].id;
    console.log(`Usando tenant: ${tenants[0].name} (${tenantId})`);

    const passwordHash = await bcrypt.hash('cared123', 10);

    const joyeros = [
        { email: 'joyero1@cared.mx', name: 'Joyero 1' },
        { email: 'joyero2@cared.mx', name: 'Joyero 2' },
        { email: 'joyero3@cared.mx', name: 'Joyero 3' },
    ];

    for (const j of joyeros) {
        const user = await prisma.user.upsert({
            where: { email: j.email },
            update: {
                name: j.name,
                passwordHash,
                role: 'JOYERO',
                tenantId,
            },
            create: {
                email: j.email,
                name: j.name,
                passwordHash,
                role: 'JOYERO',
                tenantId,
            },
        });
        console.log(`✓ Usuario creado/actualizado: ${user.email} (Rol: ${user.role})`);
    }
}

main()
    .catch((e) => {
        console.error('Error creando joyeros:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
