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
      
      const numSchoolId = parseInt(schoolId, 10);
      if (isNaN(numSchoolId)) {
        return { status: 'success', holidays: [] };
      }

      // 1. Fetch all holidays for the school using safe findMany
      // This routes perfectly through the Dual-Write Proxy
      const schoolHolidays = await (client as any).holidays.findMany({
        where: { school_id: numSchoolId },
        select: { date: true, reason: true, fn: true, an: true, class_ids: true },
        orderBy: { date: 'asc' },
      });

      const numClassId = parseInt(classId, 10);

      // 2. Filter in JavaScript
      const filtered = schoolHolidays.filter((h: any) => {
        if (!h.class_ids) return false;
        
        // Handle if Prisma returns strings or arrays for JSON
        let ids = h.class_ids;
        if (typeof ids === 'string') {
          try { ids = JSON.parse(ids); } catch(e) { return false; }
        }
        
        if (Array.isArray(ids)) {
          // Check for numeric, string, or maybe 0 representing 'all'
          return isNaN(numClassId) ? false : (ids.includes(numClassId) || ids.includes(classId) || ids.includes(String(classId)));
        }
        return false;
      });

      // 3. Emulate DISTINCT date, reason, fn, an
      const uniqueHolidays: { date: string; reason: string; fn: string; an: string }[] = [];
      const seen = new Set();
      
      for (const h of filtered) {
        // Ensure date is a string format that the frontend expects
        let dateStr = h.date;
        if (h.date instanceof Date) {
          dateStr = h.date.toISOString(); // keep full ISO string or split depending on frontend
        }
        
        const key = `${dateStr}-${h.reason}-${h.fn}-${h.an}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueHolidays.push({
            date: dateStr,
            reason: h.reason,
            fn: h.fn,
            an: h.an,
          });
        }
      }

      return {
        status: 'success',
        holidays: uniqueHolidays,
      };
    } catch (error: any) {
      console.error('🔥 Failed to fetch holidays:', error);
      throw new InternalServerErrorException('Database query failed: ' + error.message);
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
