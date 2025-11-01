import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusFeePaymentService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.BusFeePaymentCreateInput) {
    return this.prisma.busFeePayment.create({ data });
  }

  findAll() {
    return this.prisma.busFeePayment.findMany({ include: { busFeeStructure: true } });
  }

  findOne(id: number) {
    return this.prisma.busFeePayment.findUnique({ where: { id }, include: { busFeeStructure: true } });
  }

  update(id: number, data: Prisma.BusFeePaymentUpdateInput) {
    return this.prisma.busFeePayment.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.busFeePayment.delete({ where: { id } });
  }
}
