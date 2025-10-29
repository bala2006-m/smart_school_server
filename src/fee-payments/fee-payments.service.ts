import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FeePaymentsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.feePayments.findMany({
      include: { studentFee: true },
    });
  }

  async getById(id: number) {
    return this.prisma.feePayments.findUnique({
      where: { id },
      include: { studentFee: true },
    });
  }

 async createFeePayment(data: any) {
  return this.prisma.feePayments.create({
    data: {
      student_fee_id: data.student_fee_id, // references StudentFees.aId
      amount: data.amount,
      payment_date: data.payment_date ? new Date(data.payment_date) : undefined,
      method: data.method,
      transaction_id: data.transaction_id,
      status: data.status || 'pending',
    },
  });
}

  async update(id: number, data: any) {
    return this.prisma.feePayments.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.feePayments.delete({
      where: { id },
    });
  }
}
