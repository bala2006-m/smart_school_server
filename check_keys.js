
const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    console.log('Prisma Client Keys:');
    const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log(keys.sort());

    if (prisma.attendance_user) console.log('Found attendance_user');
    if (prisma.Attendance_user) console.log('Found Attendance_user');
    if (prisma.blockedSchool) console.log('Found blockedSchool');
    if (prisma.BlockedSchool) console.log('Found BlockedSchool');

    await prisma.$disconnect();
}

main().catch(console.error);
