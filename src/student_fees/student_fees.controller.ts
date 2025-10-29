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

  /**
   * Record a student payment
   */
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
}
