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
        class_id,
      },
      orderBy: { created_at: 'desc' },
    });
  }

   async findAllStructuresSchool(school_id: number) {
    return this.prisma.rteStructure.findMany({
      where: {
        school_id,
      },
      orderBy: { created_at: 'desc' },
    });
  }
    async findActiveStructures(school_id: number, class_id?: number) {
    return this.prisma.rteStructure.findMany({
      where: {
        school_id,
        class_id,
        status:'active'
      },
      orderBy: { created_at: 'desc' },
    });
  }
async findAllRteStudents(school_id: number, class_id?: number) {
    return this.prisma.student.findMany({
      where: {
        school_id,
        class_id,
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
        class_id,
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
        student_id
      },
      orderBy: { payment_date: 'desc' },
    });
  }



async findPendingPaidBySchool(school_id: number) {
  // 1️⃣ Get all active RTE fee structures
  const totalRteFees = await this.prisma.rteStructure.findMany({
    where: { school_id, status: "active" },
    select: {
      id: true,
      class_id: true,
      total_amount: true,
    },
  });

  // 2️⃣ Initialize data holders
  const allStudents: Record<string, any[]> = {};
  const totalStudents: Record<string, number> = {};
  const paidStudents: Record<string, any[]> = {};
  const pendingStudents: Record<string, any[]> = {};
  const paidAmounts: Record<string, number> = {};
  const pendingAmounts: Record<string, number> = {};

  // 3️⃣ Loop through each RTE fee structure (class-wise)
  for (const fee of totalRteFees) {
    const students = await this.prisma.student.findMany({
      where: {
        school_id,
        isRTE: true,
        class_id: fee.class_id,
      },
      select: {
        username: true,
        name: true,
        class_id: true,
        mobile: true,
      },
    });

    // Use class_id as the grouping key
    const key = `${fee.class_id}`;

    allStudents[key] = students;
    totalStudents[key] = students.length;
    paidStudents[key] = [];
    pendingStudents[key] = [];
    paidAmounts[key] = 0;
    pendingAmounts[key] = 0;

    // Process each student in this class
    for (const student of students) {
      const payments = await this.prisma.rteFeePayment.findMany({
        where: {
          rte_fee_structure_id: fee.id,
          student_id: student.username,
          status: { in: ["PAID", "PARTIALLY_PAID"] },
        },
        select: { amount_paid: true },
      });

      const totalPaidAmount = payments.reduce(
        (sum, p) => sum + Number(p.amount_paid || 0),
        0
      );

      // 🟢 Fully paid
      if (totalPaidAmount >= Number(fee.total_amount)) {
        paidStudents[key].push({
          ...student,
          totalPaidAmount,
          status: "PAID",
        });
        paidAmounts[key] += totalPaidAmount;
      } else {
        // 🔴 Pending
        pendingStudents[key].push({
          ...student,
          totalPaidAmount,
          pendingAmount: Number(fee.total_amount) - totalPaidAmount,
          status: totalPaidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID",
        });

        paidAmounts[key] += totalPaidAmount;
        pendingAmounts[key] += Number(fee.total_amount) - totalPaidAmount;
      }
    }
  }

  // 4️⃣ Totals across all classes
  const totalPaidAmount = Object.values(paidAmounts).reduce((a, b) => a + b, 0);
  const totalPendingAmount = Object.values(pendingAmounts).reduce(
    (a, b) => a + b,
    0
  );

  const totalPaidStudents = Object.values(paidStudents).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const totalPendingStudents = Object.values(pendingStudents).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // 5️⃣ Final Return
  return {
    totalRteFees: totalRteFees.length,
    totalPaidAmount,
    totalPendingAmount,
    totalAmount: Number(totalPaidAmount) + Number(totalPendingAmount),
    totalPaidStudents,
    totalPendingStudents,
    totalStudents: Number(totalPaidStudents) + Number(totalPendingStudents),
  };
}


async findBySchoolClassAndDate(school_id: number,class_id:number, payment_date: string) {
    const startOfDay = new Date(payment_date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(payment_date);
    endOfDay.setHours(23, 59, 59, 999);
    const data = await this.prisma.rteFeePayment.findMany({
      where: {
        school_id,class_id, payment_date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      include: { student: {
        select:{
          name:true,
          username:true,
          gender:true,

        }
      }, RteStructure: true, classes: true, admin: {
        select:{
          name:true,
          username:true,
        }
      } },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }
}
