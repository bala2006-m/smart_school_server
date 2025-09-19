import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class ClassTimetableService {
  constructor(private prisma: PrismaService) {}

  // async saveTimetables(data: string) {
  //   const lines = data
  //     .split('\n')
  //     .map((line) => line.trim())
  //     .filter(Boolean);

  //   const entries = lines.map((line) => {
  //     const [schoolIdStr, classesIdStr, dayOfWeekRaw, periodNumberStr, ...subjectParts] = line.split(' ');

  //     const schoolId = parseInt(schoolIdStr, 10);
  //     const classesId = parseInt(classesIdStr, 10);
  //     const periodNumber = parseInt(periodNumberStr, 10);
  //     const subject = subjectParts.join(' ');

  //     // Ensure dayOfWeek is a valid enum
  //     const dayOfWeek = dayOfWeekRaw as DayOfWeek;

  //     return {
  //       schoolId,
  //       classesId,
  //       dayOfWeek,
  //       periodNumber,
  //       subject,
  //     };
  //   });

  //   await this.prisma.classTimetable.createMany({
  //     data: entries,
  //     skipDuplicates: true,
  //   });

  //   return { success: true, count: entries.length };
  // }

  //parthi Add
  async saveTimetables(data: string) {
    const lines = data
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const entries = lines.map((line) => {
      const [schoolIdStr, classesIdStr, dayOfWeekRaw, periodNumberStr, ...subjectParts] = line.split(' ');
      return {
        schoolId: parseInt(schoolIdStr, 10),
        classesId: parseInt(classesIdStr, 10),
        dayOfWeek: dayOfWeekRaw as DayOfWeek,
        periodNumber: parseInt(periodNumberStr, 10),
        subject: subjectParts.join(' '),
      };
    });

    const results: any[] = [];
    for (const entry of entries) {
      const record = await this.prisma.classTimetable.upsert({
        where: {
          schoolId_classesId_dayOfWeek_periodNumber: {
            schoolId: entry.schoolId,
            classesId: entry.classesId,
            dayOfWeek: entry.dayOfWeek,
            periodNumber: entry.periodNumber,
          },
        },
        update: { subject: entry.subject },
        create: entry,
        select: { id: true, schoolId: true, classesId: true, dayOfWeek: true, periodNumber: true, subject: true },
      });
      results.push(record);
    }

    return { success: true, count: results.length, data: results };
  }

  async getTimetable(schoolId: number, classesId: number) {
    const rows = await this.prisma.classTimetable.findMany({
      where: {
        schoolId,
        classesId,
      },
      select: {
        id :true,
        dayOfWeek: true,
        periodNumber: true,
        subject: true,
      },
      orderBy: {
        periodNumber: 'asc',
      },
    });

    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const grouped: Record<string, any[]> = {};

    for (const row of rows) {
      const day = row.dayOfWeek;
      if (!grouped[day]) {
        grouped[day] = [];
      }

      grouped[day].push({
        id:row.id,
        period: row.periodNumber,
        subject: row.subject,
        session: row.periodNumber <= 4 ? 'FN' : 'AN',
      });
    }

    // Sort by custom day order
    const sortedGrouped: Record<string, any[]> = {};
    for (const day of dayOrder) {
      if (grouped[day]) {
        sortedGrouped[day] = grouped[day];
      }
    }

    return sortedGrouped;
  }


  async findByClass(schoolId: number, classesId: number) {
    return this.prisma.classTimetable.findMany({
      where: {
        schoolId,
        classesId,
      },
      orderBy: {
        periodNumber: 'asc',
      },
    });
  }
  async delete(id :string) {
    return this.prisma.classTimetable.delete({
      where: {
        id:Number(id)
      },
    });
  }
}
