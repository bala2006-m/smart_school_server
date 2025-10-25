import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { addMonths, differenceInMonths, isAfter } from 'date-fns';

@Injectable()
export class AppPaymentService {
  constructor(private prisma: PrismaService) {}

  private readonly PRICE_PER_STUDENT = 0.05;
  private readonly FREE_TRIAL_MONTHS = 3;

  // Calculate due amount for a school
  async calculateDueAmount(schoolId: number) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error('School not found');
    }
const createdAt = school.createdAt;
    if (!createdAt) {
      throw new Error('School creation date not found');
    }
    const today = new Date();
    const trialEndDate = addMonths(new Date(createdAt), this.FREE_TRIAL_MONTHS);

    // Still in free trial
    if (isAfter(trialEndDate, today)) {
      return {
        dueAmount: 0,
        isFreeTrialActive: true,
        trialEndDate,
        dueDate: school.dueDate,
      };
    }

    // Check if school has made payment
    const lastPayment = await this.prisma.appPayment.findFirst({
      where: { schoolId, status: 'COMPLETED' },
      orderBy: { paidAt: 'desc' },
    });

    return {
      dueAmount: 0, // Will be calculated based on plan choice
      isFreeTrialActive: false,
      trialEndDate,
      dueDate: school.dueDate,
      lastPayment,
    };
  }

  // Get payment amount based on plan and student count
  calculatePaymentAmount(studentsCount: number, paymentPlan: 'MONTHLY' | 'YEARLY') {
    if (paymentPlan === 'YEARLY') {
      return studentsCount * this.PRICE_PER_STUDENT * 10; // Pay for 10 months
    } else {
      return studentsCount * this.PRICE_PER_STUDENT; // Pay for 1 month
    }
  }

  // Create payment record
  async createPayment(data: {
    schoolId: number;
    studentsCount: number;
    paymentPlan: 'MONTHLY' | 'YEARLY';
    transactionId?: string;
  }) {
    const amount = this.calculatePaymentAmount(data.studentsCount, data.paymentPlan);
    
    const school = await this.prisma.school.findUnique({
      where: { id: data.schoolId },
    });
const createdAt = school!.createdAt;
    if (!createdAt) {
      throw new Error('School creation date not found');
    }
    const trialEndDate = addMonths(createdAt, this.FREE_TRIAL_MONTHS);
    const today = new Date();
    
    // Period start is either trial end date or today (whichever is later)
    const periodStart = isAfter(today, trialEndDate) ? today : trialEndDate;
    
    // Period end depends on payment plan
    const periodEnd = data.paymentPlan === 'YEARLY' 
      ? addMonths(periodStart, 12) 
      : addMonths(periodStart, 1);

    const payment = await this.prisma.appPayment.create({
      data: {
        schoolId: data.schoolId,
        studentsCount: data.studentsCount,
        paymentPlan: data.paymentPlan,
        amount,
        periodStart,
        periodEnd,
        transactionId: data.transactionId,
        status: 'PENDING',
      },
    });

    return payment;
  }


  // Get all payments for a school
  async getSchoolPayments(schoolId: number) {
    return this.prisma.appPayment.findMany({
      where: { schoolId },
      orderBy: { paidAt: 'desc' },
    });
  }

  // Get payment report
  async getPaymentReport(schoolId: number) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { appPayment: true },
    });

    const totalPaid = school!.appPayment
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      school,
      totalPayments: school!.appPayment.length,
      completedPayments: school!.appPayment.filter(p => p.status === 'COMPLETED').length,
      totalPaid,
      payments: school!.appPayment,
    };
  }
  async updatePaymentStatus(
    paymentId: number, 
    status: 'COMPLETED' | 'FAILED',
    transactionId?: string  // Add this parameter
  ) {
    const payment = await this.prisma.appPayment.update({
      where: { id: paymentId },
      data: { 
        status,
        transactionId: transactionId || null,  // Store transaction ID
      },
    });

    // Update school's due date if payment is completed
    if (status === 'COMPLETED') {
      await this.prisma.school.update({
        where: { id: payment.schoolId },
        data: { dueDate: payment.periodEnd },
      });
    }

    return payment;
  }
}
