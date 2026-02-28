import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBusFeeStructureDto, UpdateBusFeeStructureDto } from './dto/bus-fee-structure.dto';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class BusFeeStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async create(data: CreateBusFeeStructureDto) {
    try {
      const client = this.dbConfig.getDatabaseClient(this.request);
      // Automatically set updated_by same as created_by on creation
      return await (client as any).busFeeStructure.create({
        data: {
          ...data,
          updated_by: data.updated_by ?? data.created_by,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return await (client as any).busFeeStructure.findMany({
      include: { busFeePayment: true, },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const record = await (client as any).busFeeStructure.findUnique({
      where: { id },
      include: { busFeePayment: true, },
    });
    if (!record) {
      throw new NotFoundException(`Bus Fee Structure with ID ${id} not found`);
    }
    return record;
  }

  async update(id: number, data: UpdateBusFeeStructureDto) {
    try {
      await this.findOne(id); // ensure it exists
      const client = this.dbConfig.getDatabaseClient(this.request);
      return await (client as any).busFeeStructure.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: number) {
    await this.findOne(id); // ensure exists before deleting
    const client = this.dbConfig.getDatabaseClient(this.request);
    return await (client as any).busFeeStructure.delete({ where: { id } });
  }

  async findActive() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return await (client as any).busFeeStructure.findMany({
      where: { status: 'active' },
      include: { busFeePayment: true, school: true },
    });
  }

  // ✅ NEW: Find all by school_id
  async findBySchool(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: { school_id: schoolId },
      include: { busFeePayment: true, },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(`No Bus Fee Structures found for school ID ${schoolId}`);
    }

    return data;
  }

  async findActiveBySchool(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: { school_id: schoolId, status: 'active' },
      include: { busFeePayment: true, },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(`No Bus Fee Structures found for school ID ${schoolId}`);
    }

    return data;
  }
  async findBySchoolClass(schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: {
        school_id: schoolId,
        busFeePayment: {
          some: {
            class_id: classId
          }
        }
      },
      include: { busFeePayment: true },
      orderBy: { created_at: 'asc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(`No Bus Fee Structures found for school ID ${schoolId} and class ID ${classId}`);
    }

    return data;
  }


  async findBySchoolRoute(schoolId: number, route: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: {
        AND: [
          { school_id: Number(schoolId) },
          { route: route },
          { status: 'active' },
        ],
      },
      include: {
        busFeePayment: true,

      },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `No Bus Fee Structures found for school ID ${schoolId} and route "${route}".`,
      );
    }

    return data;
  }

  async findByOnlySchoolRoute(schoolId: number, route: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: {
        AND: [
          { school_id: Number(schoolId) },
          { route: route },
          { status: 'active' },
        ],
      },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `No Bus Fee Structures found for school ID ${schoolId} and route "${route}".`,
      );
    }

    return data;
  }
  async findBySchoolRouteUsername(schoolId: number, route: string, username: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).busFeeStructure.findMany({
      where: {
        school_id: Number(schoolId),
        route: route,
        status: 'active',
      },
      include: {
        busFeePayment: {
          where: {
            student_id: username, // Include only this student's payments
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(
        `No Bus Fee Structures found for school ID ${schoolId} and route "${route}".`,
      );
    }

    return data;
  }


  async toggleStatus(id: number, status: string, updated_by: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existing = await (client as any).busFeeStructure.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Bus Fee Structure not found');
    }

    return (client as any).busFeeStructure.update({
      where: { id },
      data: {
        status,
        updated_by,
        updated_at: new Date(),
      },
    });
  }

}
