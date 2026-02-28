import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class StudentFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async getStudentFee(username: string, schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.findMany({
      where: { username, school_id: Number(schoolId), class_id: Number(classId) },
      include: { payments: true },
    });
  }
  async getAll() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.findMany({
      include: { payments: true, class: true, school: true, user: true },
    });
  }

  async getById(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.findUnique({
      where: { aId: id },
      include: { payments: true, class: true, school: true, user: true },
    });
  }

  async createStudentFee(data: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.create({
      data: {
        id: data.id, // business id
        school_id: data.school_id,
        class_id: data.class_id,
        username: data.username,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount || 0,
        status: data.status, // should be one of StudentFeesStatus enum values
        createdBy: data.createdBy,
        remarks: data.remarks,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      },
    });
  }


  async update(id: number, data: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.update({
      where: { aId: id },
      data,
    });
  }

  async delete(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).studentFees.delete({
      where: { aId: id },
    });
  }
}
