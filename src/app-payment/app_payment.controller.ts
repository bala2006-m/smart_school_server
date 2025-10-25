import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { AppPaymentService } from './app_payment.service';

@Controller('app_payment')
export class AppPaymentController {
  constructor(private paymentService: AppPaymentService) {}

  @Get('due-amount/:schoolId')
  async getDueAmount(@Param('schoolId') schoolId: string) {
    return this.paymentService.calculateDueAmount(Number(schoolId));
  }

  @Post('calculate')
  calculateAmount(
    @Body() body: { studentsCount: number; paymentPlan: 'MONTHLY' | 'YEARLY' },
  ) {
    const amount = this.paymentService.calculatePaymentAmount(
      body.studentsCount,
      body.paymentPlan,
    );
    return { amount, studentsCount: body.studentsCount, paymentPlan: body.paymentPlan };
  }

  @Post('create')
  async createPayment(
    @Body()
    body: {
      schoolId: number;
      studentsCount: number;
      paymentPlan: 'MONTHLY' | 'YEARLY';
      transactionId?: string;
    },
  ) {
    return this.paymentService.createPayment(body);
  }

  @Patch('update-status/:paymentId')
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() body: { status: 'COMPLETED' | 'FAILED';
        transactionId?: string;
     },
  ) {
    return this.paymentService.updatePaymentStatus(Number(paymentId), body.status,body.transactionId);
  }

  @Get('history/:schoolId')
  async getPaymentHistory(@Param('schoolId') schoolId: string) {
    return this.paymentService.getSchoolPayments(Number(schoolId));
  }

  @Get('report/:schoolId')
  async getPaymentReport(@Param('schoolId') schoolId: string) {
    return this.paymentService.getPaymentReport(Number(schoolId));
  }
}
