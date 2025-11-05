import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBusFeeStructureDto, UpdateBusFeeStructureDto } from './dto/bus-fee-structure.dto';

@Injectable()
export class BusFeeStructureService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateBusFeeStructureDto) {
    try {
      // Automatically set updated_by same as created_by on creation
      return await this.prisma.busFeeStructure.create({
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
    return await this.prisma.busFeeStructure.findMany({
      include: { busFeePayment: true, },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.busFeeStructure.findUnique({
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
      return await this.prisma.busFeeStructure.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: number) {
    await this.findOne(id); // ensure exists before deleting
    return await this.prisma.busFeeStructure.delete({ where: { id } });
  }

  async findActive() {
    return await this.prisma.busFeeStructure.findMany({
      where: { status: 'active' },
      include: { busFeePayment: true, school: true },
    });
  }

  // ✅ NEW: Find all by school_id
  async findBySchool(schoolId: number) {
    const data = await this.prisma.busFeeStructure.findMany({
      where: { school_id: schoolId },
      include: { busFeePayment: true, },
      orderBy: { created_at: 'desc' },
    });

    if (!data || data.length === 0) {
      throw new NotFoundException(`No Bus Fee Structures found for school ID ${schoolId}`);
    }

    return data;
  }
 async findBySchoolClass(schoolId: number, classId: number) {
  const data = await this.prisma.busFeeStructure.findMany({
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
  const data = await this.prisma.busFeeStructure.findMany({
    where: {
      AND: [
        { school_id: Number(schoolId) },
        { route: route },
        {status:'active'},
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
  const data = await this.prisma.busFeeStructure.findMany({
    where: {
      AND: [
        { school_id: Number(schoolId) },
        { route: route },
        {status:'active'},
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
  const data = await this.prisma.busFeeStructure.findMany({
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
  const existing = await this.prisma.busFeeStructure.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error('Bus Fee Structure not found');
  }

  return this.prisma.busFeeStructure.update({
    where: { id },
    data: {
      status,
      updated_by,
      updated_at: new Date(),
    },
  });
}

}
