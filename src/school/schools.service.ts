// src/school/schools.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) { }

  async countStudentsBySchool(schoolId: number): Promise<number> {
    return this.prisma.student.count({
      where: { school_id: schoolId, is_left: true },
    });
  }

  async countStaffBySchoolId(schoolId: number): Promise<{ status: string; count: number }> {
    const count = await this.prisma.staff.count({
      where: { school_id: schoolId },
    });
    return { status: 'success', count };
  }

  async getLastMessageBySchoolId(schoolId: number) {
    return this.prisma.messages.findFirst({
      where: { school_id: schoolId },
      orderBy: { id: 'desc' },
    });
  }

  async fetchClassData(schoolId: number) {
    return this.prisma.classes.findMany({
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
    return await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        photo: true,
        createdAt: true,
        dueDate: true,
        student_access:true
      },
    });
  }
  async findAllSchools() {
    try {
      return await this.prisma.school.findMany({
        select: { id: true, name: true, address: true, photo: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new Error(`Failed to fetch schools: ${error.message}`);
    }
  }
  async create(createSchoolDto: CreateSchoolDto, file: Express.Multer.File) {
    const existingSchool = await this.prisma.school.findUnique({
      where: { name: createSchoolDto.name },
    });

    if (existingSchool) {
      throw new InternalServerErrorException(`School is already registered`);
    }

    return this.prisma.school.create({
      data: {
        id: Number(createSchoolDto.schoolId),
        name: createSchoolDto.name,
        address: createSchoolDto.address,
        photo: new Uint8Array(file.buffer),
      },
    });
  }

  async updateDueDate(schoolId: number, dueDate: Date) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error('School not found');
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: { dueDate },
    });
  }
  // Get school with payment history
  async getSchoolWithPayments(schoolId: number) {
    return this.prisma.school.findUnique({
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
    const school = await this.prisma.school.findUnique({
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
    return this.prisma.school.findUnique({
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
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        student_access: true,
      },
    });
  
    if (!school) {
      throw new InternalServerErrorException('School not found');
    }
  
    // If student_access is NULL, return defaults
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
  await this.prisma.school.update({
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
