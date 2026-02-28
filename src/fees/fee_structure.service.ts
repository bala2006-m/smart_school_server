import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class FeeStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // ✅ Create new fee structure
  async createFeeStructure(data: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    try {
      // 1️⃣ Check for existing record
      const existing = await (client as any).feeStructure.findFirst({
        where: {
          school_id: data.school_id,
          class_id: data.class_id,
          title: data.title,
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Fee structure with the same description already exists for this class.',
        );
      }

      // 2️⃣ Parse start_date and end_date
      const now = new Date();
      const startDate = data.start_date ? new Date(data.start_date) : now;
      const endDate = data.end_date
        ? new Date(data.end_date)
        : new Date(new Date(startDate).setFullYear(startDate.getFullYear() + 1));

      // 3️⃣ Validate date range
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date.');
      }

      // 4️⃣ Create record
      const newFee = await (client as any).feeStructure.create({
        data: {
          school_id: data.school_id,
          class_id: data.class_id,
          title: data.title,
          descriptions: data.descriptions,
          amounts: data.amounts,
          total_amount: data.total_amount,
          start_date: startDate,
          end_date: endDate,
          created_by: data.created_by,
          updated_by: data.updated_by ?? data.created_by,
          status: 'inactive',
        },
      });

      return newFee;
    } catch (err) {
      throw new BadRequestException(err.message || 'Error creating fee structure');
    }
  }

  // ✅ Get all fee structures for a school
  async getAllFeeStructures(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feeStructure.findMany({
      where: { school_id: schoolId },
      include: {
        class: true,
      },
      orderBy: { class_id: 'asc' },
    });
  }

  // ✅ Get fee structures by class
  async getFeeStructuresByClass(schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feeStructure.findMany({
      where: { school_id: schoolId, class_id: classId, status: 'active' },
    });
  }
  async getAllFeeStructuresByClass(schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feeStructure.findMany({
      where: { school_id: schoolId, class_id: classId },
    });
  }
  async getFirstFeeStructuresByClassName(schoolId: number, className: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const firstClass = await (client as any).classes.findFirst({
      where: {
        school_id: schoolId,
        class: className,
      },
      orderBy: { id: 'asc' },
    });

    if (!firstClass) return null;

    return (client as any).feeStructure.findMany({
      where: {
        school_id: schoolId,
        class_id: firstClass.id,
      },
      include: {
        class: true,
      },
    });
  }

  // ✅ Update status (active/inactive)
  async updateStatus(id: number, status: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const fee = await (client as any).feeStructure.findUnique({ where: { id } });
    if (!fee) throw new NotFoundException('Fee structure not found');
    console.log(status);

    return (client as any).feeStructure.update({
      where: { id },
      data: { status },
    });
  }

  // ✅ Update fee structure
  async updateFeeStructure(id: number, data: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const fee = await (client as any).feeStructure.findUnique({ where: { id } });
    if (!fee) throw new NotFoundException('Fee structure not found');

    // Handle dates properly
    const startDate = data.start_date ? new Date(data.start_date) : fee.start_date;
    const endDate = data.end_date
      ? new Date(data.end_date)
      : fee.end_date ?? new Date(new Date(startDate!).setFullYear(startDate!.getFullYear() + 1));

    if (endDate <= startDate!) {
      throw new BadRequestException('End date must be after start date.');
    }

    return (client as any).feeStructure.update({
      where: { id },
      data: {
        title: data.title ?? fee.title,
        descriptions: data.description ?? fee.descriptions,
        amounts: data.amounts ?? fee.amounts,
        total_amount: data.total_amount ?? fee.total_amount,
        start_date: startDate,
        end_date: endDate,
        updated_by: data.updated_by ?? fee.updated_by,
      },
    });
  }

  // ✅ Delete a fee structure
  async deleteFeeStructure(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);

    const fee = await (client as any).feeStructure.findUnique({ where: { id } });


    if (!fee) throw new NotFoundException('Fee structure not found');

    return (client as any).feeStructure.delete({ where: { id } });
  }
}
