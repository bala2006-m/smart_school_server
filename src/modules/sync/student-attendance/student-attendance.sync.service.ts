import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../../../common/database/database.config';

@Injectable()
export class StudentAttendanceSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // 📥 PULL — cloud → device
  async pull(school_id: number, lastSync: string) {
    const lastSyncDate = new Date(lastSync);

    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).studentAttendance.findMany({
      where: {
        school_id,
        updated_at: {
          gt: lastSyncDate,
        },
      },
      orderBy: {
        updated_at: 'asc',
      },
    });

    return {
      data,
      serverTime: new Date(),
    };
  }

  // 📤 PUSH — device → cloud
  async push(items: any[]) {
    if (!items.length) return { success: true };

    const client = this.dbConfig.getDatabaseClient(this.request);
    await client.$transaction(
      items.map((item) =>
        (client as any).studentAttendance.upsert({
          where: {
            username_school_date
              : {
              username: item.username,
              school_id: item.school_id,
              date: new Date(item.date),
            },
          },

          update: {
            fn_status: item.fn_status,
            an_status: item.an_status,
            is_deleted: item.is_deleted,
            updated_at: new Date(item.updated_at),
          },

          create: {
            username: item.username,
            school_id: item.school_id,
            class_id: item.class_id,
            date: new Date(item.date),
            fn_status: item.fn_status,
            an_status: item.an_status,
            updated_at: new Date(item.updated_at),
            is_deleted: item.is_deleted ?? false,
          },
        }),
      ),
    );

    return { success: true };
  }
}
