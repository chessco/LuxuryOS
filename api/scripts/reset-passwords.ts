import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const newPassword = 'pitaya123';
    console.log(`Resetting passwords for all users to: ${newPassword}`);

    try {
        const users = await prisma.user.findMany();
        const passwordHash = await bcrypt.hash(newPassword, 10);

        for (const user of users) {
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            });
            console.log(`- Updated password for: ${user.email}`);
        }

        console.log(`\nSuccessfully updated ${users.length} users.`);
    } catch (error) {
        console.error('Error resetting passwords:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
