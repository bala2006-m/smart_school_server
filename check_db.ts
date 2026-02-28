import { PrismaClient } from '@prisma/client';

async function main() {
    const localClient = new PrismaClient({
        datasources: {
            db: {
                url: 'mysql://root:bala30012006@localhost:3306/ramchin_smart_school_local',
            },
        },
    });

    try {
        const columns: any[] = await localClient.$queryRawUnsafe(`DESCRIBE Messages`);
        console.log('Columns in Messages table:');
        console.table(columns);

        const hasSyncStatus = columns.some(c => c.Field === 'sync_status');
        console.log('Has sync_status:', hasSyncStatus);
    } catch (error) {
        console.error('Error describing table:', error);
    } finally {
        await localClient.$disconnect();
    }
}

main();
