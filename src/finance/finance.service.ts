// src/finance/finance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Finance, Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.FinanceCreateInput): Promise<Finance> {
    return this.prisma.finance.create({ data });
  }

  async findAll(): Promise<Finance[]> {
    return this.prisma.finance.findMany();
  }

    async update(id: number, data: Prisma.FinanceUpdateInput): Promise<Finance> {
    return this.prisma.finance.update({ where: { id }, data });
  }

  async remove(id: number): Promise<Finance> {
    return this.prisma.finance.delete({ where: { id } });
  }

  async findIncome(school_id: number) {
  return this.prisma.finance.findMany({ where: { school_id,type:'INCOME'} });
}

async findExpense(school_id: number) {
  return this.prisma.finance.findMany({ where: { school_id,type:'EXPENSE'} });
}

}
