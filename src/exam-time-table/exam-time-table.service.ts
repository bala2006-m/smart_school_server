import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class ExamTimeTableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // Create Exam Timetable
  async create(data: Prisma.ExamTimeTableCreateInput) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.create({
      data,
    });
  }

  // Get All Timetables
  async findAll() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.findMany({
      include: {
        class: true,
        school: true,
      },
    });
  }

  // Get Single Timetable
  async findOne(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.findUnique({
      where: { id },
      include: {
        class: true,
        school: true,
      },
    });
  }

  // Update Timetable
  async update(id: number, data: Prisma.ExamTimeTableUpdateInput) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.update({
      where: { id },
      data,
    });
  }

  // Delete Timetable
  async remove(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.delete({
      where: { id },
    });
  }

  // Get by School & Class
  async findBySchoolAndClass(
    school_id: number,
    class_id: number,
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).examTimeTable.findMany({
      where: {
        school_id,
        class_id,
      },
    });
  }
}
