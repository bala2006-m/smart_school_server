import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StudentFeesStatus } from '@prisma/client'; // ensure you have this enum defined in schema

@Injectable()
export class StudentFeesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign fee record to a student based on class and school.
   * This pulls FeeStructure, sums up the total, and stores snapshot.
   */
  async assignStudentFees(schoolId: number, classId: number, username: string, id: number,createdBy:string) {
    const structures = await this.prisma.feeStructure.findMany({
      where: { school_id: schoolId, class_id: classId, status: 'active',id },
    });

    if (!structures.length) {
      throw new NotFoundException('No active fee structure found for this class');
    }

    const total = structures.reduce((sum, f) => sum + Number(f.total_amount), 0);

    return this.prisma.studentFees.create({
      data: {
        id:id,
        school_id: schoolId,
        class_id: classId,
        username,
        total_amount: total,
        paid_amount: 0,
      createdBy:createdBy,
        status: StudentFeesStatus.PENDING,
      },
    });
  }

  /**
   * Record a fee payment for a student.
   * Automatically updates total paid and fee status.
   */
  async recordPayment(studentFeeId: number, amount: number, method: string, transactionId?: string) {
    const studentFee = await this.prisma.studentFees.findUnique({
      where: { aId : studentFeeId },
    });

    if (!studentFee) throw new NotFoundException('Student fee record not found');

    // Create a new payment record
    const payment = await this.prisma.feePayments.create({
      data: {
        student_fee_id: studentFeeId,
        amount,
        method,
        transaction_id: transactionId ?? null,
      },
    });

    const newPaid = studentFee.paid_amount + amount;
    const status =
      newPaid >= studentFee.total_amount
        ? StudentFeesStatus.PAID
        : newPaid > 0
        ? StudentFeesStatus.PARTIALLY_PAID
        : StudentFeesStatus.PENDING;

    // Update the student fee progress
    await this.prisma.studentFees.update({
      where: { aId: studentFeeId },
      data: {
        paid_amount: newPaid,
        status,
      
      },
    });

    return payment;
  }

  /**
   * Get fee summary for a student
   */
  async getStudentFee(username: string, schoolId: number,classId : number) {
    return this.prisma.studentFees.findMany({
      where: { username, school_id: Number(schoolId) ,class_id:Number(classId)},
      include: { payments: true ,admin:true},
    });
  }

  /**
   * Get all students’ fee info by class
   */
  async getFeesByClass(schoolId: number, classId: number) {
    return this.prisma.studentFees.findMany({
      where: { school_id: schoolId, class_id: classId },
      include: { payments: true, user: true },
    });
  }

  /**
   * Update status manually (Admin use)
   */
  async updateFeeStatus(studentFeeId: number, status: StudentFeesStatus) {
    return this.prisma.studentFees.update({
      where: { aId: studentFeeId },
      data: { status },
    });
  }
}
