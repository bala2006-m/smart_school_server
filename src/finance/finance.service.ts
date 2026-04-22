// src/finance/finance.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { finance, Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  private _academicDateFilter() {
    const academicStart = RequestContextService.academicStart;
    const academicEnd = RequestContextService.academicEnd;
    if (academicStart && academicEnd) {
      return { date: { gte: academicStart, lte: academicEnd } };
    }
    return {};
  }

  async create(data: Prisma.financeCreateInput): Promise<finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.create({ data });
  }

  async findAll(): Promise<finance[]> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({
      where: { ...this._academicDateFilter() },
    });
  }

  async update(id: number, data: Prisma.financeCreateInput): Promise<finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.update({ where: { id }, data });
  }

  async remove(id: number): Promise<finance> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.delete({ where: { id } });
  }

  async findIncome(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'INCOME', ...this._academicDateFilter() } });
  }

  async findExpense(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'EXPENSE', ...this._academicDateFilter() } });
  }
  async findDIn(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'DRAWING_IN', ...this._academicDateFilter() } });
  }
  async findDOut(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).finance.findMany({ where: { school_id, type: 'DRAWING_OUT', ...this._academicDateFilter() } });
  }

}
