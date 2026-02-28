import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';
import { CreateRteStructureDto } from './dto/create-rte-structure.dto';
import { UpdateRteStructureDto } from './dto/update-rte-structure.dto';
import { CreateRtePaymentDto } from './dto/create-rte-payment.dto';

@Injectable()
export class RteFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // Create fee structure
  async createStructure(dto: CreateRteStructureDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).rteStructure.create({
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
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).rteStructure.findMany({
      where: {
        school_id,
        class_id,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllStructuresSchool(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).rteStructure.findMany({
      where: {
        school_id,
      },
      include: {
        class: true,

      },
      orderBy: { created_at: 'desc' },
    });
  }
  async findActiveStructures(school_id: number, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).rteStructure.findMany({
      where: {
        school_id,
        class_id,
        status: 'active'
      },
      orderBy: { created_at: 'desc' },
    });
  }
  async findAllRteStudents(school_id: number, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).student.findMany({
      where: {
        school_id,
        class_id,
        isRTE: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        route: true, gender: true, mobile: true, class_id: true, school_id: true, father_name: true,
        class: true,
        school: {
          select: {
            name: true,
            address: true
          }
        },

      },
      orderBy: [

        { username: 'asc' }, { gender: 'desc' },],
    });
  }


  async findAllRtePaidStudents(school_id: number, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).student.findMany({
      where: {
        school_id,
        class_id,
        isRTE: true,
      },
      select: {
        name: true, username: true, gender: true, mobile: true,
        rteFeePayment: true
      },
      orderBy: [

        { username: 'asc' }, { gender: 'desc' },],
    });
  }
  // Get one structure
  async findOneStructure(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const data = await (client as any).rteStructure.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('RTE Structure not found');
    return data;
  }

  // Update
  async updateStructure(id: number, dto: UpdateRteStructureDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    await this.findOneStructure(id);

    return (client as any).rteStructure.update({
      where: { id },
      data: {
        ...dto,
        updated_by: dto.created_by ?? 'system',
      },
    });
  }

  // Delete
  async removeStructure(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    await this.findOneStructure(id);
    return (client as any).rteStructure.delete({ where: { id } });
  }

  // Create Payment
  async createPayment(dto: CreateRtePaymentDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    console.log(dto);

    return (client as any).rteFeePayment.create({
      data: {

        ...dto,
        payment_date: new Date(dto.payment_date),

      },
    });
  }

  // List payments
  async listPayments(school_id: number, student_id?: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).rteFeePayment.findMany({
      where: {
        school_id,
        student_id
      },
      orderBy: { payment_date: 'desc' },
    });
  }



  // async findPendingPaidBySchool(school_id: number) {
  //   // 1️⃣ Get all active RTE fee structures
  //   const totalRteFees = await this.prisma.rteStructure.findMany({
  //     where: { school_id, status: "active" },
  //     select: {
  //       id: true,
  //       class_id: true,
  //       total_amount: true,
  //     },
  //   });

  //   // 2️⃣ Initialize data holders
  //   const allStudents: Record<string, any[]> = {};
  //   const totalStudents: Record<string, number> = {};
  //   const paidStudents: Record<string, any[]> = {};
  //   const pendingStudents: Record<string, any[]> = {};
  //   const paidAmounts: Record<string, number> = {};
  //   const pendingAmounts: Record<string, number> = {};

  //   // 3️⃣ Loop through each RTE fee structure (class-wise)
  //   for (const fee of totalRteFees) {
  //     const students = await this.prisma.student.findMany({
  //       where: {
  //         school_id,
  //         isRTE: true,
  //         class_id: fee.class_id,
  //       },
  //       select: {
  //         username: true,
  //         name: true,
  //         class_id: true,
  //         mobile: true,
  //       },
  //     });

  //     // Use class_id as the grouping key
  //     const key = `${fee.class_id}`;

  //     allStudents[key] = students;
  //     totalStudents[key] = students.length;
  //     paidStudents[key] = [];
  //     pendingStudents[key] = [];
  //     paidAmounts[key] = 0;
  //     pendingAmounts[key] = 0;

  //     // Process each student in this class
  //     for (const student of students) {
  //       const payments = await this.prisma.rteFeePayment.findMany({
  //         where: {
  //           rte_fee_structure_id: fee.id,
  //           student_id: student.username,
  //           status: { in: ["PAID", "PARTIALLY_PAID"] },
  //         },
  //         select: { amount_paid: true },
  //       });

  //       const totalPaidAmount = payments.reduce(
  //         (sum, p) => sum + Number(p.amount_paid || 0),
  //         0
  //       );

  //       // 🟢 Fully paid
  //       if (totalPaidAmount >= Number(fee.total_amount)) {
  //         paidStudents[key].push({
  //           ...student,
  //           totalPaidAmount,
  //           status: "PAID",
  //         });
  //         paidAmounts[key] += totalPaidAmount;
  //       } else {
  //         // 🔴 Pending
  //         pendingStudents[key].push({
  //           ...student,
  //           totalPaidAmount,
  //           pendingAmount: Number(fee.total_amount) - totalPaidAmount,
  //           status: totalPaidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID",
  //         });

  //         paidAmounts[key] += totalPaidAmount;
  //         pendingAmounts[key] += Number(fee.total_amount) - totalPaidAmount;
  //       }
  //     }
  //   }

  //   // 4️⃣ Totals across all classes
  //   const totalPaidAmount = Object.values(paidAmounts).reduce((a, b) => a + b, 0);
  //   const totalPendingAmount = Object.values(pendingAmounts).reduce(
  //     (a, b) => a + b,
  //     0
  //   );

  //   const totalPaidStudents = Object.values(paidStudents).reduce(
  //     (sum, arr) => sum + arr.length,
  //     0
  //   );
  //   const totalPendingStudents = Object.values(pendingStudents).reduce(
  //     (sum, arr) => sum + arr.length,
  //     0
  //   );

  //   // 5️⃣ Final Return
  //   return {
  //     totalRteFees: totalRteFees.length,
  //     totalPaidAmount,
  //     totalPendingAmount,
  //     totalAmount: Number(totalPaidAmount) + Number(totalPendingAmount),
  //     totalPaidStudents,
  //     totalPendingStudents,
  //     totalStudents: Number(totalPaidStudents) + Number(totalPendingStudents),
  //   };
  // }

  async findPendingPaidBySchool(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    // 1️⃣ Get all active RTE fee structures
    const totalRteFees = await (client as any).rteStructure.findMany({
      where: { school_id, status: "active" },
      select: {
        id: true,
        class_id: true,
        total_amount: true,
      },
    });

    if (!totalRteFees.length) {
      return {
        totalRteFees: 0,
        totalPaidAmount: 0,
        totalPendingAmount: 0,
        totalAmount: 0,
        totalPaidStudents: 0,
        totalPendingStudents: 0,
        totalStudents: 0,
      };
    }

    const classIds = totalRteFees.map(f => f.class_id);
    const feeIds = totalRteFees.map(f => f.id);

    // 2️⃣ Fetch all RTE students in one query
    const students = await (client as any).student.findMany({
      where: {
        school_id,
        isRTE: true,
        class_id: { in: classIds },
      },
      select: {
        username: true,
        class_id: true,
      },
    });

    // 3️⃣ Fetch all payments in one query
    const payments = await (client as any).rteFeePayment.findMany({
      where: {
        rte_fee_structure_id: { in: feeIds },
        student_id: { in: students.map(s => s.username) },
        status: { in: ["PAID", "PARTIALLY_PAID"] },
      },
      select: {
        student_id: true,
        rte_fee_structure_id: true,
        amount_paid: true,
      },
    });

    // 4️⃣ Build lookup maps
    const feeMap = new Map<number, { id: number; class_id: number; total_amount: number | null }>(
      totalRteFees.map(f => [f.class_id, f] as [number, { id: number; class_id: number; total_amount: number | null }])
    );

    const paymentMap = new Map<string, number>();

    for (const p of payments) {
      const key = `${p.student_id}-${p.rte_fee_structure_id}`;
      paymentMap.set(
        key,
        (paymentMap.get(key) || 0) + Number(p.amount_paid || 0)
      );
    }

    let totalPaidAmount = 0;
    let totalPendingAmount = 0;
    let totalPaidStudents = 0;
    let totalPendingStudents = 0;

    for (const student of students) {
      const fee = feeMap.get(student.class_id);
      if (!fee) continue;

      const key = `${student.username}-${fee.id}`;
      const totalPaid = paymentMap.get(key) || 0;
      const totalAmount = Number(fee.total_amount);

      if (totalPaid >= totalAmount) {
        totalPaidStudents++;
        totalPaidAmount += totalPaid;
      } else {
        totalPendingStudents++;
        totalPaidAmount += totalPaid;
        totalPendingAmount += totalAmount - totalPaid;
      }
    }

    return {
      totalRteFees: totalRteFees.length,
      totalPaidAmount,
      totalPendingAmount,
      totalAmount: totalPaidAmount + totalPendingAmount,
      totalPaidStudents,
      totalPendingStudents,
      totalStudents: totalPaidStudents + totalPendingStudents,
    };
  }

  async findBySchoolClassAndDate(school_id: number, class_id: number, payment_date: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const startOfDay = new Date(payment_date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(payment_date);
    endOfDay.setHours(23, 59, 59, 999);
    const data = await (client as any).rteFeePayment.findMany({
      where: {
        school_id, class_id, payment_date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      include: {
        student: {
          select: {
            name: true,
            username: true,
            gender: true,

          }
        }, RteStructure: true, classes: true, admin: {
          select: {
            name: true,
            username: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }
}
