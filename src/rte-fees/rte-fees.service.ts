import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateRteStructureDto } from './dto/create-rte-structure.dto';
import { UpdateRteStructureDto } from './dto/update-rte-structure.dto';
import { CreateRtePaymentDto } from './dto/create-rte-payment.dto';

@Injectable()
export class RteFeesService {
  constructor(private prisma: PrismaService) {}

  // Create fee structure
 async createStructure(dto: CreateRteStructureDto) {
  return this.prisma.rteStructure.create({
    data: {
      school_id: dto.school_id,
      class_id: dto.class_id,
      descriptions: dto.descriptions ?? [],
      amounts: dto.amounts ?? [],
      total_amount: dto.total_amount ?? null,
      created_by: dto.created_by,
      updated_by: dto.created_by,   // IMPORTANT FIX
      status: dto.status ?? 'inactive',
    },
  });
}


  // Get all structures
  async findAllStructures(school_id: number, class_id?: number) {
    return this.prisma.rteStructure.findMany({
      where: {
        school_id,
        ...(class_id && { class_id }),
      },
      orderBy: { created_at: 'desc' },
    });
  }
async findAllRteStudents(school_id: number, class_id?: number) {
    return this.prisma.student.findMany({
      where: {
        school_id,
        ...(class_id && { class_id }),
        isRTE:true,
      },
      orderBy: [
        
        {username: 'asc'},{gender:'desc'}, ],
    });
  }


  async findAllRtePaidStudents(school_id: number, class_id?: number) {
    return this.prisma.student.findMany({
      where: {
        school_id,
        ...(class_id && { class_id }),
        isRTE:true,
      },
      select:{
        name:true,username:true,gender:true,mobile:true,
       rteFeePayment:true
      },
      orderBy: [
        
        {username: 'asc'},{gender:'desc'}, ],
    });
  }
  // Get one structure
  async findOneStructure(id: number) {
    const data = await this.prisma.rteStructure.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('RTE Structure not found');
    return data;
  }

  // Update
  async updateStructure(id: number, dto: UpdateRteStructureDto) {
    await this.findOneStructure(id);

    return this.prisma.rteStructure.update({
      where: { id },
      data: {
        ...dto,
        updated_by: dto.created_by ?? 'system',
      },
    });
  }

  // Delete
  async removeStructure(id: number) {
    await this.findOneStructure(id);
    return this.prisma.rteStructure.delete({ where: { id } });
  }

  // Create Payment
  async createPayment(dto: CreateRtePaymentDto) {
    return this.prisma.rteFeePayment.create({
      data: {
        ...dto,
      },
    });
  }

  // List payments
  async listPayments(school_id: number, student_id?: string) {
    return this.prisma.rteFeePayment.findMany({
      where: {
        school_id,
        ...(student_id && { student_id }),
      },
      orderBy: { payment_date: 'desc' },
    });
  }
}
