import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@pitayacode.io';
    const newPassword = 'pitaya123';

    console.log(`Updating password for user: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: {
                passwordHash,
            },
        });

        console.log(`Password updated successfully for ${email}`);
    } catch (error) {
        console.error('Error updating password:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
