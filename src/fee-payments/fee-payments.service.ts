import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class FeePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async getAll() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feePayments.findMany({
      include: { studentFee: true },
    });
  }

  async getById(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feePayments.findUnique({
      where: { id },
      include: { studentFee: true },
    });
  }

  async createFeePayment(data: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feePayments.create({
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
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feePayments.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feePayments.delete({
      where: { id },
    });
  }
}
