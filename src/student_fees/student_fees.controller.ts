import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { StudentFeesService } from './student_fees.service';
import { StudentFeesStatus } from '@prisma/client';

@Controller('student-fees')
export class StudentFeesController {
  constructor(private readonly studentFeesService: StudentFeesService) {}

  @Post('assign')
  async assignStudentFees(
    @Body()
    body: {
      schoolId: number;
      classId: number;
      username: string;
      id: number;
      createdBy:string;
    },
  ) {
    return this.studentFeesService.assignStudentFees(
      body.schoolId,
      body.classId,
      body.username,
      body.id,
      body.createdBy,
    );
  }

  @Post('pay')
  async recordPayment(
    @Body()
    body: {
      studentFeeId: number;
      amount: number;
      method: string;
      transactionId?: string;
    },
  ) {
    return this.studentFeesService.recordPayment(
      body.studentFeeId,
      body.amount,
      body.method,
      body.transactionId,
    );
  }

  /**
   * Get a student's fee summary
   */
  @Get('student')
  async getStudentFee(
    @Query('username') username: string,
    @Query('schoolId') schoolId: number,
     @Query('classId') classId: number,
  ) {
    return this.studentFeesService.getStudentFee(username, schoolId,classId);
  }

  /**
   * Get all student fees for a class
   */
  @Get('class/:classId')
  async getFeesByClass(
    @Param('classId') classId: number,
    @Query('schoolId') schoolId: number,
  ) {
    return this.studentFeesService.getFeesByClass(schoolId, classId);
  }
@Get('paid_class/:classId')
  async getPaidFeesByClass(
    @Param('classId') classId: number,
    @Query('schoolId') schoolId: number,
  ) {
    return this.studentFeesService.getPaidFeesByClass(schoolId, classId);
  }
@Get('daily_paid/:date')
  async getDailyPaidFees(
    @Param('date') date: Date,
    @Query('schoolId') schoolId: number,
  ) {
    
    
    return this.studentFeesService.getDailyPaidFees(schoolId, date);
  }
  @Get('periodical_paid/:startDate/:endDate')
  async getPeriodicalPaidFees(
    @Param('startDate') startDate: Date,
    @Param('endDate') endDate: Date,
    @Query('schoolId') schoolId: number,
  ) {
    
    
    return this.studentFeesService.getPeriodicalPaidFees(schoolId, startDate,endDate);
  }
  /**
   * Update fee status (Admin)
   */
  @Patch('status')
  async updateFeeStatus(
    @Body()
    body: { studentFeeId: number; status: StudentFeesStatus },
  ) {
    return this.studentFeesService.updateFeeStatus(
      body.studentFeeId,
      body.status,
    );
  }
@Get('pending')
  async getPendingFees(@Query('school_id') school_id: number) {
    return this.studentFeesService.getPendingFeeList(+school_id);
  }
  @Get('count_pending')
  async getCountPendingFees(@Query('school_id') school_id: number) {
    return this.studentFeesService.getCountPendingFees(+school_id);
  }

  @Get('pending_paid_school/:schoolId')
  async getPaidFeesBySchool(
    @Param('schoolId') schoolId: number,
  ) {
    return this.studentFeesService.getPaidFeesBySchool(schoolId);
  }
  
}
