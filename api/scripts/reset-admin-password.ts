import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@pitayacode.io';
    const password = 'pitaya123';
    const saltRounds = 10;

    console.log(`Resetting password for ${email}...`);

    const hash = await bcrypt.hash(password, saltRounds);

    await prisma.user.update({
        where: { email },
        data: { passwordHash: hash }
    });

    console.log('Password updated successfully with a fresh hash.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
