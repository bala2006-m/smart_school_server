// src/finance/finance.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Finance, Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async create(data: Prisma.FinanceCreateInput): Promise<Finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.create({ data });
  }

  async findAll(): Promise<Finance[]> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany();
  }

  async update(id: number, data: Prisma.FinanceUpdateInput): Promise<Finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.update({ where: { id }, data });
  }

  async remove(id: number): Promise<Finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.delete({ where: { id } });
  }

  async findIncome(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'INCOME' } });
  }

  async findExpense(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'EXPENSE' } });
  }
  async findDIn(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'DRAWING_IN' } });
  }
  async findDOut(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'DRAWING_OUT' } });
  }

}
