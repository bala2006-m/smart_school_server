// src/school/schools.service.ts
import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';

import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async countStudentsBySchool(schoolId: number): Promise<number> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).student.count({
      where: { school_id: schoolId, is_left: true },
    });
  }

  async countStaffBySchoolId(schoolId: number): Promise<{ status: string; count: number }> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const count = await (client as any).staff.count({
      where: { school_id: schoolId },
    });
    return { status: 'success', count };
  }

  async getLastMessageBySchoolId(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).messages.findFirst({
      where: { school_id: schoolId, role: 'admin' },
      orderBy: { id: 'desc' },
    });
  }

  async fetchClassData(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).classes.findMany({
      where: { school_id: schoolId },
      select: { id: true, class: true, section: true },
      orderBy: { class: 'asc' },
    });
  }

  async fetchCombinedSchoolData(schoolId: number) {
    // Run queries in parallel
    const [totalStudents, staffCountResult, lastMessage, classData] = await Promise.all([
      this.countStudentsBySchool(schoolId),
      this.countStaffBySchoolId(schoolId),
      this.getLastMessageBySchoolId(schoolId),
      this.fetchClassData(schoolId),
    ]);

    // Sort classes by class and section
    classData.sort((a, b) => {
      const classCompare = a.class.localeCompare(b.class);
      return classCompare !== 0 ? classCompare : a.section.localeCompare(b.section);
    });

    return {
      totalStudents,
      totalStaff: staffCountResult.count,
      lastMessage,
      classes: classData,
    };
  }

  async findById(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return await (client as any).school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        photo: true,
        createdAt: true,
        dueDate: true,
        student_access: true

      },
    });
  }
  async findAllSchools() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    try {
      return await (client as any).school.findMany({
        select: { id: true, name: true, address: true, photo: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new Error(`Failed to fetch schools: ${error.message}`);
    }
  }
  async create(createSchoolDto: CreateSchoolDto, file: Express.Multer.File) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existingSchool = await (client as any).school.findUnique({
      where: { name: createSchoolDto.name },
    });

    if (existingSchool) {
      throw new InternalServerErrorException(`School is already registered`);
    }

    return (client as any).school.create({
      data: {
        id: Number(createSchoolDto.schoolId),
        name: createSchoolDto.name,
        address: createSchoolDto.address,
        photo: new Uint8Array(file.buffer),
      },
    });
  }

  async updateDueDate(schoolId: number, dueDate: Date) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const school = await (client as any).school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error('School not found');
    }

    return (client as any).school.update({
      where: { id: schoolId },
      data: { dueDate },
    });
  }
  // Get school with payment history
  async getSchoolWithPayments(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).school.findUnique({
      where: { id: schoolId },
      include: {
        appPayment: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });
  }

  // Check if payment is overdue
  async isPaymentOverdue(schoolId: number): Promise<boolean> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const school = await (client as any).school.findUnique({
      where: { id: schoolId },
      select: { dueDate: true, createdAt: true },
    });

    if (!school) {
      throw new Error('School not found');
    }

    // If no due date set, check if trial is over (3 months from creation)
    if (!school.dueDate && school.createdAt) {
      const trialEndDate = new Date(school.createdAt);
      trialEndDate.setMonth(trialEndDate.getMonth() + 3);
      return new Date() > trialEndDate;
    }

    // If due date is set, check if it's passed
    if (school.dueDate) {
      return new Date() > school.dueDate;
    }

    return false;
  }
  async getSchoolById(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
        dueDate: true,
      },
    });

  }

  async fetchStudentAccess(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const school = await (client as any).school.findUnique({
      where: { id: schoolId },
      select: {
        student_access: true,
      },
    });

    if (!school) {
      throw new InternalServerErrorException('School not found');
    }


    const defaultAccess = {
      viewHomework: true,
      events: true,
      message: true,
    };

    return {
      status: 'success',
      student_access: school.student_access ?? defaultAccess,
    };
  }

  async updateStudentAccess(
    school_id: number,
    student_access: Record<string, boolean>,
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    await (client as any).school.update({
      where: { id: school_id },
      data: {
        student_access,
      },
    });

    return {
      status: 'success',
      message: 'Student access updated successfully',
      student_access,
    };
  }
}
