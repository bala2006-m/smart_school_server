import { NotFoundException, Injectable, InternalServerErrorException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DeleteHolidayDto } from './dto/delete-holiday.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class HolidaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async addHoliday(dto: CreateHolidayDto) {
    try {
      const client = this.dbConfig.getDatabaseClient(this.request);
      // Optional: prevent duplicate entries
      const existing = await (client as any).holidays.findFirst({
        where: {
          date: new Date(dto.date),
          school_id: dto.school_id,
        },
      });

      if (existing) {
        throw new ConflictException('Holiday already exists for this date');
      }

      const holiday = await (client as any).holidays.create({
        data: {
          date: new Date(dto.date),
          reason: dto.reason,
          school_id: dto.school_id,
          class_ids: dto.class_ids as any, // Ensure your Prisma schema uses `Json` type for this
          fn: dto.fn,
          an: dto.an,
        },
      });

      return {
        status: 'success',
        holiday,
      };
    } catch (error) {
      console.error('❌ Failed to create holiday:', error);
      throw new InternalServerErrorException('Could not create holiday');
    }
  }


  async fetchHolidays(school_id: string) {
    const schoolIdInt = Number(school_id);
    const client = this.dbConfig.getDatabaseClient(this.request);

    const holidays = await (client as any).holidays.findMany({
      where: {
        school_id: schoolIdInt,
      },
      select: {
        date: true,
        reason: true,
        class_ids: true, // JSON field (array of class IDs)
        fn: true,
        an: true,
        classes: {
          select: {
            id: true,
            class: true,
            section: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return {
      status: 'success',
      holidays,
    };
  }

  async getHolidaysByClass(schoolId: string, classId: string) {
    try {
      const client = this.dbConfig.getDatabaseClient(this.request);
      const holidays = await client.$queryRawUnsafe<
        { date: string; reason: string; fn?: string; an?: string }[]
      >(
        `
        SELECT DISTINCT date, reason, fn, an
        FROM Holidays
        WHERE school_id = ?
          AND JSON_CONTAINS(class_ids, ?, '$')
        ORDER BY date ASC
        `,
        Number(schoolId),
        JSON.stringify(Number(classId)), // must be a JSON string
      );

      return {
        status: 'success',
        holidays,
      };
    } catch (error) {
      console.error('🔥 Failed to fetch holidays:', error);
      throw new InternalServerErrorException('Database query failed');
    }
  }

  async deleteHoliday(dto: DeleteHolidayDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const result = await (client as any).holidays.deleteMany({
      where: {
        date: new Date(dto.date),
        school_id: dto.school_id,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Holiday not found');
    }

    return { status: 'success', message: 'Holiday removed' };
  }
}
