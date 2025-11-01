import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StudentFeesStatus } from '@prisma/client'; // ensure you have this enum defined in schema
import { tr } from 'date-fns/locale';

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
      where: { school_id: Number(schoolId), class_id: Number(classId) },
      orderBy:{
        createdAt:'asc'
      },
      include: { payments: true, user: true,admin:true },
    });
  }
 async getPaidFeesByClass(schoolId: number, classId: number) {
    return this.prisma.studentFees.findMany({
      where: { school_id: Number(schoolId), class_id: Number(classId) ,status:'PAID',},
      orderBy:{
        id:'asc',
      },
      include: { payments: true, user: true,admin:true ,feeStructure:true},
    });
  }

 async getDailyPaidFees(schoolId: number, date: Date) {
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.prisma.studentFees.findMany({
    where: {
      school_id: Number(schoolId),
      status: 'PAID',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      class_id: 'asc',
    },
    include: {
      payments: true,
      user: true,
      admin: true,
      feeStructure: true,
      class:true,
    },
  });
}
async getPeriodicalPaidFees(schoolId: number, startDate: Date,endDate: Date) {
  
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  return this.prisma.studentFees.findMany({
    where: {
      school_id: Number(schoolId),
      status: 'PAID',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      class_id: 'asc',
    },
    include: {
      payments: true,
      user: true,
      admin: true,
      feeStructure: true,
      class:true,
    },
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

 async getPendingFeeList(schoolId: number) {
  // 1️⃣ Find all classes in the school that have fee structures
  const classesWithFees = await this.prisma.classes.findMany({
    where: {
      school_id: schoolId,
      feeStructure: {
        some: {}, // class has at least one fee structure
      },
    },
    include: {
      feeStructure: true,
    },
  });

  const classIds = classesWithFees.map(c => c.id);

  // 2️⃣ Fetch students who belong to those classes and haven’t paid any fees
  const pendingStudents = await this.prisma.student.findMany({
    where: {
      school_id: schoolId,
      class_id: { in: classIds },
      studentFees: {
        none: {}, // no payments at all
      },
    },
    include: {
      class: true,
    },
  });

  // 3️⃣ Return combined result
  return {
    school_id: schoolId,
    totalPending: pendingStudents.length,
    students: pendingStudents,
    feeStructures: classesWithFees.flatMap(c => c.feeStructure),
  };
}

}
