import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusFeeStructureService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.BusFeeStructureCreateInput) {
    return this.prisma.busFeeStructure.create({ data });
  }

  findAll() {
    return this.prisma.busFeeStructure.findMany({ include: { busFeePayment: true } });
  }

  findOne(id: number) {
    return this.prisma.busFeeStructure.findUnique({ where: { id }, include: { busFeePayment: true } });
  }

  update(id: number, data: Prisma.BusFeeStructureUpdateInput) {
    return this.prisma.busFeeStructure.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.busFeeStructure.delete({ where: { id } });
  }
}
