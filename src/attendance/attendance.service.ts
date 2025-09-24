import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateStaffAttendanceDto } from './dto/create-staff-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkAttendanceExists(schoolId: string, classId: string, date: string): Promise<boolean> {
    try {
      const exists = await this.prisma.studentAttendance.findFirst({
        where: {
          school_id: Number(schoolId),
          class_id: Number(classId),
          date: new Date(date),
        },
      });
      return !!exists;
    } catch (error) {
      throw new InternalServerErrorException('Database query failed');
    }
  }

  async checkAttendanceExistsSession(
  schoolId: string,
  classId: string,
  date: string,
  session: 'FN' | 'AN'
): Promise<boolean> {
  try {
    const statusField = session === 'FN' ? 'fn_status' : 'an_status';

    const exists = await this.prisma.studentAttendance.findFirst({
      where: {
        school_id: Number(schoolId),
        class_id: Number(classId),
        date: new Date(date),
        [statusField]: {
          in: ['P', 'A'],
        },
      },
    });

    return !!exists;
  } catch (error) {
    throw new InternalServerErrorException('Database query failed');
  }
}

  async fetchAttendanceByClassId(class_id: string, school_id: string, username: string) {
    return this.prisma.studentAttendance.findMany({
      where: {
        class_id: Number(class_id),
        school_id: Number(school_id),
        username,
      },
      select: {
        date: true,
        fn_status: true,
        an_status: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async markStudentAttendance(dto: CreateAttendanceDto) {
    const { username, date, session, status, school_id, class_id } = dto;
    const attendanceDate = new Date(date);

    if (isNaN(attendanceDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const existing = await this.prisma.studentAttendance.findUnique({
      where: {
        username_school_date: {
          username,
          date: attendanceDate,
          school_id:Number(school_id)
      
        },
      },
    });

    const fn_status = session === 'FN' ? status : 'NM';
    const an_status = session === 'AN' ? status : 'NM';

    if (existing) {
      await this.prisma.studentAttendance.update({
        where: {
          username_school_date: {
            username,
            date: attendanceDate,
            school_id:Number(school_id)
          },
        },
        data: {
          fn_status: session === 'FN' ? status : existing.fn_status,
          an_status: session === 'AN' ? status : existing.an_status,
        },
      });
    } else {
      await this.prisma.studentAttendance.create({
        data: {
          username,
          date: attendanceDate,
          fn_status,
          an_status,
          school_id: Number(school_id),
          class_id: Number(class_id),
        },
      });
    }

    return { status: 'success', message: 'Student attendance recorded' };
  }

  async getStudentAttendance(date?: string, schoolId?: string) {
    if (!schoolId) return [];

    const whereCondition: any = {
      school_id: parseInt(schoolId),
    };

    if (date) {
      whereCondition.date = new Date(date);
    }

    return this.prisma.studentAttendance.findMany({
      where: whereCondition,
      select: {
        username: true,
        date: true,
        fn_status: true,
        an_status: true,
      },
      
    });
  }

  async getAttendanceByClassAndDate(
    class_id: string,
    date: string,
    school_id: string,
  ) {
    const students = await this.prisma.student.findMany({
      where: {
        class_id: Number(class_id),
        school_id: Number(school_id),
      },
      select: {
        username: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: {
        class_id: Number(class_id),
        school_id: Number(school_id),
        date: new Date(date),
      },
    });

    const attendance = students.map((student) => {
      const record = attendanceRecords.find(
        (att) => att.username === student.username,
      );
      return {
        username: student.username,
        name: student.name,
        fn_status: record?.fn_status ?? null,
        an_status: record?.an_status ?? null,
      };
    });

    return {
      status: 'success',
      count: attendance.length,
      attendance,
    };
  }
  async getMonthlySummary(username: string, month: number, year: number,school_id: number) {
    const monthNum = Number(month);
    const yearNum = Number(year);

    if (
      !username ||
      isNaN(monthNum) ||
      isNaN(yearNum) ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > 2100
    ) {
      return {
        status: 'error',
        message: 'Invalid or missing username, month, or year',
        monthNum,
        yearNum,
      };
    }

    const fromDate = new Date(yearNum, monthNum - 1, 1);
    const toDate = new Date(yearNum, monthNum, 0);

    const records = await this.prisma.studentAttendance.findMany({
      where: {
        username,
        date: {
          gte: fromDate,
          lte: toDate,
        },
        school_id:Number(school_id)
      },
      select: {
        date: true,
        fn_status: true,
        an_status: true,
      },
      orderBy: { date: 'asc' },
    });

    // Instead of counts, collect arrays of dates for each category
    const fnPresentDates: string[] = [];
    const anPresentDates: string[] = [];
    const fnAbsentDates: string[] = [];
    const anAbsentDates: string[] = [];

    for (const record of records) {
      const dateStr = record.date.toISOString().split('T')[0]; // Format 'YYYY-MM-DD'

      if (record.fn_status === 'P') fnPresentDates.push(dateStr);
      if (record.fn_status === 'A') fnAbsentDates.push(dateStr);

      if (record.an_status === 'P') anPresentDates.push(dateStr);
      if (record.an_status === 'A') anAbsentDates.push(dateStr);
    }

    const totalSessions = records.length * 2; // Each day has FN + AN
    const totalPresent = fnPresentDates.length + anPresentDates.length;
    const totalPercentage =
      totalSessions === 0 ? 0 : (totalPresent / totalSessions) * 100;

    return {
      status: 'success',
      TotalMarking: records.length, // Total marking days
      month,
      year,
      fnPresentDates,
      anPresentDates,
      fnAbsentDates,
      anAbsentDates,
      totalPercentage: Number(totalPercentage.toFixed(2)),
    };
  }

  async getDailySummary(username: string, date: string,school_id:number) {
    const record = await this.prisma.studentAttendance.findUnique({
      where: {
        username_school_date: {
          username,
          date: new Date(date),
          school_id
        },
      },
      select: {
        fn_status: true,
        an_status: true,
      },
    });

    return {
      status: 'success',
      date,
      username,
      record: record ?? { fn_status: null, an_status: null },
    };
  }

  async markStaffAttendance(dto: CreateStaffAttendanceDto) {
    const { username, date, session, status, school_id } = dto;
    const attendanceDate = new Date(date);

    const existing = await this.prisma.staffAttendance.findUnique({
      where: {
        username_school_date_staff: {
          username,
          date: attendanceDate,
          school_id:Number(school_id)
        },
      },
    });

    const fn_status = session === 'FN' ? status : 'NM';
    const an_status = session === 'AN' ? status : 'NM';

    if (existing) {
      await this.prisma.staffAttendance.update({
        where: {
          username_school_date_staff: {
            username,
            date: attendanceDate,
            school_id:Number(school_id)
          },
        },
        data: {
          fn_status: session === 'FN' ? status : existing.fn_status,
          an_status: session === 'AN' ? status : existing.an_status,
        },
      });
    } else {
      await this.prisma.staffAttendance.create({
        data: {
          username,
          date: attendanceDate,
          fn_status,
          an_status,
          school_id: Number(school_id),
        },
      });
    }

    return { status: 'success', message: 'Staff attendance recorded' };
  }

  async getStaffDailySummary(username: string, date: string,school_id:number) {
    const record = await this.prisma.staffAttendance.findUnique({
      where: {
        username_school_date_staff: {
          username,
          date: new Date(date),
          school_id
        },
      },
      select: {
        fn_status: true,
        an_status: true,
      },
    });

    return {
      status: 'success',
      date,
      username,
      record: record ?? { fn_status: null, an_status: null },
    };
  }
async getStudentAttendanceBetweenDateRange(
  username: string,
  fromDateInput: string,
  toDateInput: string,
  school_id: number
) {
  const fromDate = new Date(fromDateInput);
  const toDate = new Date(toDateInput);

  if (
    !username ||
    isNaN(fromDate.getTime()) ||
    isNaN(toDate.getTime()) ||
    fromDate > toDate
  ) {
    return {
      status: 'error',
      message: 'Invalid or missing username, fromDate, or toDate',
    };
  }

  const records = await this.prisma.studentAttendance.findMany({
    where: {
      username,
      date: {
        gte: fromDate,
        lte: toDate,
      },
      school_id:Number(school_id)
    },
    select: {
      date: true,
      fn_status: true,
      an_status: true,
    },
    orderBy: { date: 'asc' },
  });

  const fnPresentDates: string[] = [];
  const anPresentDates: string[] = [];
  const fnAbsentDates: string[] = [];
  const anAbsentDates: string[] = [];

  for (const record of records) {
    const dateStr = record.date.toISOString().split('T')[0];

    if (record.fn_status === 'P') fnPresentDates.push(dateStr);
    if (record.fn_status === 'A') fnAbsentDates.push(dateStr);

    if (record.an_status === 'P') anPresentDates.push(dateStr);
    if (record.an_status === 'A') anAbsentDates.push(dateStr);
  }

  const totalSessions = records.length * 2;
  const totalPresent = fnPresentDates.length + anPresentDates.length;
  const totalPercentage = totalSessions === 0 ? 0 : (totalPresent / totalSessions) * 100;

  return {
    status: 'success',
    TotalMarking: records.length,
    fnPresentDates,
    anPresentDates,
    fnAbsentDates,
    anAbsentDates,
    totalPercentage: Number(totalPercentage.toFixed(2)),
  };
}


  async getStaffMonthly(username: string, month: number, year: number) {
    const monthNum = Number(month);
    const yearNum = Number(year);

    if (
      !username ||
      isNaN(monthNum) ||
      isNaN(yearNum) ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > 2100
    ) {
      return {
        status: 'error',
        message: 'Invalid or missing username, month, or year',
        monthNum,
        yearNum,
      };
    }

    const fromDate = new Date(yearNum, monthNum - 1, 1);
    const toDate = new Date(yearNum, monthNum, 0);

    const records = await this.prisma.staffAttendance.findMany({
      where: {
        username,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        date: true,
        fn_status: true,
        an_status: true,
      },
      orderBy: { date: 'asc' },
    });

    // Instead of counts, collect arrays of dates for each category
    const fnPresentDates: string[] = [];
    const anPresentDates: string[] = [];
    const fnAbsentDates: string[] = [];
    const anAbsentDates: string[] = [];

    for (const record of records) {
      const dateStr = record.date.toISOString().split('T')[0]; // Format 'YYYY-MM-DD'

      if (record.fn_status === 'P') fnPresentDates.push(dateStr);
      if (record.fn_status === 'A') fnAbsentDates.push(dateStr);

      if (record.an_status === 'P') anPresentDates.push(dateStr);
      if (record.an_status === 'A') anAbsentDates.push(dateStr);
    }

    const totalSessions = records.length * 2; // Each day has FN + AN
    const totalPresent = fnPresentDates.length + anPresentDates.length;
    const totalPercentage =
      totalSessions === 0 ? 0 : (totalPresent / totalSessions) * 100;

    return {
      status: 'success',
      TotalMarking: records.length, // Total marking days
      month,
      year,
      fnPresentDates,
      anPresentDates,
      fnAbsentDates,
      anAbsentDates,
      totalPercentage: Number(totalPercentage.toFixed(2)),
    };
  }

  async getStaffAttendanceBetweenDateRange(
  username: string,
  fromDateInput: string,
  toDateInput: string,
) {
  const fromDate = new Date(fromDateInput);
  const toDate = new Date(toDateInput);

  if (
    !username ||
    isNaN(fromDate.getTime()) ||
    isNaN(toDate.getTime()) ||
    fromDate > toDate
  ) {
    return {
      status: 'error',
      message: 'Invalid or missing username, fromDate, or toDate',
    };
  }

  const records = await this.prisma.staffAttendance.findMany({
    where: {
      username,
      date: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      date: true,
      fn_status: true,
      an_status: true,
    },
    orderBy: { date: 'asc' },
  });

  const fnPresentDates: string[] = [];
  const anPresentDates: string[] = [];
  const fnAbsentDates: string[] = [];
  const anAbsentDates: string[] = [];

  for (const record of records) {
    const dateStr = record.date.toISOString().split('T')[0];

    if (record.fn_status === 'P') fnPresentDates.push(dateStr);
    if (record.fn_status === 'A') fnAbsentDates.push(dateStr);

    if (record.an_status === 'P') anPresentDates.push(dateStr);
    if (record.an_status === 'A') anAbsentDates.push(dateStr);
  }

  const totalSessions = records.length * 2;
  const totalPresent = fnPresentDates.length + anPresentDates.length;
  const totalPercentage = totalSessions === 0 ? 0 : (totalPresent / totalSessions) * 100;

  return {
    status: 'success',
    TotalMarking: records.length,
    fnPresentDates,
    anPresentDates,
    fnAbsentDates,
    anAbsentDates,
    totalPercentage: Number(totalPercentage.toFixed(2)),
  };
}

  async fetchAttendance(date?: string, schoolId?: string) {
    const whereClause: any = {};
    if (date) whereClause.date = new Date(date);
    if (schoolId) whereClause.school_id = Number(schoolId);

    const attendance = await this.prisma.staffAttendance.findMany({
      where: whereClause,
      select: {
        username: true,
        date: true,
        fn_status: true,
        an_status: true,
      },
    });

    return {
      status: 'success',
      staff: attendance,
    };
  }

  async fetchStaffAttendanceByUsername(username?: string, schoolId?: string) {
    const whereClause: any = {};
    if (username) whereClause.username = username;
    if (schoolId) whereClause.school_id = Number(schoolId);

    const attendance = await this.prisma.staffAttendance.findMany({
      where: whereClause,
      select: {
        date: true,
        fn_status: true,
        an_status: true,
      },
    });

    return {
      status: 'success',
      staff: attendance,
    };
  }

  async getAbsentees(
    date: Date,
    schoolId: number,
    classId: number,
    sessionField: 'fn_status' | 'an_status',
  ): Promise<string[]> {
    const absentees = await this.prisma.studentAttendance.findMany({
      where: {
        date,
        school_id: schoolId,
        class_id: classId,
        [sessionField]: 'A',
      },
      select: {
        username: true,
      },
    });

    return absentees.map((a) => a.username);
  }


  async getAbsenteesWithDetails(
  date: Date,
  schoolId: number,
  sessionField: 'fn_status' | 'an_status',
): Promise<
  Array<{
    username: string;
    name: string | null;
    gender: string | null;
    email: string | null;
    mobile: string | null;
    class_id: number;
    school_id: number;
  }>
> {
  try {
    const absentees = await this.prisma.studentAttendance.findMany({
      where: {
        date,
        school_id: schoolId,
        [sessionField]: 'A',
      },
      select: {
        username: true,
        class_id: true,
      },
    });

    if (absentees.length === 0) {
      return [];
    }

    // Fetch student details for all absentees in one query
    const usernames = absentees.map((a) => a.username);

    const students = await this.prisma.student.findMany({
      where: {
        username: { in: usernames },
        school_id: schoolId,
      },
      select: {
        username: true,
        name: true,
        gender: true,
        email: true,
        mobile: true,
        class_id: true,
        school_id: true,
      
      },
    });

    return students;
  } catch (error) {
    console.error('Error in getAbsenteesWithDetails:', error);
    throw error;
  }
}


}
