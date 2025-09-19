import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateStaffAttendanceDto } from './dto/create-staff-attendance.dto';
import { FetchStudentAttendanceDto } from './dto/fetch-student-attendance.dto';
import { IsNumber } from 'class-validator';
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('fetch_stu_absent_all')
  async getAbsentStudents(
    @Query('date') date: string,
    @Query('school_id') schoolId: string,
    @Query('class_id') classId: string,
  ) {
    if (!date || !schoolId || !classId) {
      throw new BadRequestException('Missing parameters');
    }

    const parsedDate = new Date(date);
    const schoolIdInt = parseInt(schoolId);
    const classIdInt = parseInt(classId);

    const fnAbsentees = await this.attendanceService.getAbsentees(
      parsedDate,
      schoolIdInt,
      classIdInt,
      'fn_status',
    );
    const anAbsentees = await this.attendanceService.getAbsentees(
      parsedDate,
      schoolIdInt,
      classIdInt,
      'an_status',
    );

    return {
      status: 'success',
      fn_absentees: fnAbsentees,
      an_absentees: anAbsentees,
    };
  }

@Get('check_attendance_status')
  async checkAttendanceStatus(
    @Query('school_id') schoolId: string,
    @Query('class_id') classId: string,
    @Query('date') date: string,
  ) {
    if (!schoolId || !classId || !date) {
      throw new BadRequestException(
        'Missing required parameters: school_id, class_id, or date',
      );
    }

    const attendanceExists = await this.attendanceService.checkAttendanceExists(
      schoolId,
      classId,
      date,
    );

    return {
      status: 'success',
      attendance_exists: attendanceExists,
    };
  }

  
@Get('check_attendance_status_session')
  async checkAttendanceStatusSession(
    @Query('school_id') schoolId: string,
    @Query('class_id') classId: string,
    @Query('date') date: string,
    @Query('session') session: 'FN' | 'AN',
  ) {
    if (!schoolId || !classId || !date||!session) {
      throw new BadRequestException(
        'Missing required parameters: school_id, class_id,session, or date',
      );
    }

    const attendanceExists = await this.attendanceService.checkAttendanceExistsSession(
      schoolId,
      classId,
      date,
      session,
    );

    return {
      status: 'success',
      attendance_exists: attendanceExists,
    };
  }
  @Post('post_student_attendance')
  async markStudent(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.markStudentAttendance(dto);
  }
  @Get('student/fetch_stu_attendance')
  async fetchStudentAttendances(
    @Query('date') date?: string,
    @Query('school_id') schoolId?: string,
  ) {
    if (!schoolId) {
      throw new BadRequestException('Missing school_id');
    }

    const attendance = await this.attendanceService.getStudentAttendance(
      date,
      schoolId,
    );

    return {
      status: 'success',
      staff: attendance,
    };
  }

  @Get('student/fetch_stu_attendance_by_class_id')
  async fetchStudentAttendance(@Query() query: FetchStudentAttendanceDto) {
    const { class_id, school_id, username } = query;

    if (!class_id || !school_id || !username) {
      return { status: 'error', message: 'Missing required parameters' };
    }

    const student = await this.attendanceService.fetchAttendanceByClassId(
      class_id,
      school_id,
      username,
    );

    return {
      status: 'success',
      student,
    };
  }
  @Get('student/class')
  async getAttendanceByClassAndDate(
    @Query('class_id') classId: string,
    @Query('date') date: string,
    @Query('school_id') schoolId: string,
  ) {
    if (!classId || !date) {
      return { status: 'error', message: 'Missing class_id or date' };
    }

    return this.attendanceService.getAttendanceByClassAndDate(
      classId,
      date,
      schoolId,
    );
  }
  @Get('student/monthly')
  async getMonthlySummary(
    @Query('username') username: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('school_id') school_id: number
  ) {
    if (!username) {
      return { status: 'error', message: 'Missing username' };
    }
    if (!month) {
      return { status: 'error', message: 'Missing month' };
    }
    if (!year) {
      return { status: 'error', message: 'Missing year' };
    }

    return this.attendanceService.getMonthlySummary(username, +month, +year,school_id);
  }

  @Get('student/betweensummary')
  async getStudentSummary(
    @Query('username') username: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,@Query('school_id') school_id: number
  ) {
    
    // Basic validation can be enhanced further
    if (!username) {
      return { status: 'error', message: 'Missing usernam' };
    }
    if (!fromDate) {
      return { status: 'error', message: 'Missing fromdate' };
    }
    if (!toDate) {
      return { status: 'error', message: 'Missing todate' };
    }
    return this.attendanceService.getStudentAttendanceBetweenDateRange(
      username,
      fromDate,
      toDate,
      school_id
    );
  }

  @Get('student/daily-summary')
  async getDailySummary(
    @Query('username') username: string,
    @Query('date') date: string,
    @Query('school_id') school_id: number,
  ) {
    if (!username || !date) {
      return { status: 'error', message: 'Missing username or date' };
    }

    return this.attendanceService.getDailySummary(username, date,school_id);
  }

  @Post('staff')
  async markStaffAttendance(@Body() dto: CreateStaffAttendanceDto) {
    return this.attendanceService.markStaffAttendance(dto);
  }
  @Get('staff/daily-summary')
  async getStaffDaily(
    @Query('username') username: string,
    @Query('school_id') school_id:number,
    @Query('date') date: string,
  ) {
    if (!username || !date) {
      return { status: 'error', message: 'Missing username or date' };
    }

    return this.attendanceService.getStaffDailySummary(username, date,school_id);
  }
  @Get('staff/monthly')
  async getStaffMonthly(
    @Query('username') username: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.attendanceService.getStaffMonthly(username, +month, +year);
  }
  @Get('staff/fetch_staff_attendance')
  async fetchStaffAttendance(
    @Query('date') date?: string,
    @Query('school_id') schoolId?: string,
  ) {
    if (date && !schoolId) {
      throw new BadRequestException(
        'school_id is required when filtering by date',
      );
    }

    return this.attendanceService.fetchAttendance(date, schoolId);
  }

  @Get('staff/betweensummary')
  async getStaffSummary(
    @Query('username') username: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    
    // Basic validation can be enhanced further
    if (!username) {
      return { status: 'error', message: 'Missing usernam' };
    }
    if (!fromDate) {
      return { status: 'error', message: 'Missing fromdate' };
    }
    if (!toDate) {
      return { status: 'error', message: 'Missing todate' };
    }
    return this.attendanceService.getStaffAttendanceBetweenDateRange(
      username,
      fromDate,
      toDate,
    );
  }

  @Get('staff/fetch_staff_attendance_by_username')
  async fetchStaffAttendanceByUsername(
    @Query('username') username?: string,
    @Query('school_id') schoolId?: string,
  ) {
    if (username && !schoolId) {
      throw new BadRequestException(
        'school_id is required when filtering by username',
      );
    }

    return this.attendanceService.fetchStaffAttendanceByUsername(
      username,
      schoolId,
    );
  }
}
