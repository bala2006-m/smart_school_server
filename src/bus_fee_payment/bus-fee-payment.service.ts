import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service'; // adjust path as needed
import { BusFeesStatus } from '@prisma/client';
import { tr } from 'date-fns/locale';

@Injectable()
export class BusFeePaymentService {
  constructor(private prisma: PrismaService) { }

  // 🟢 CREATE PAYMENT
  async create(data: any) {
    const {
      school_id,
      class_id,
      student_id,
      bus_fee_structure_id,
      amount_paid,
      payment_mode,
      reference_number,
      remarks,
      created_by,
      payment_date,
    } = data;

    if (!school_id || !student_id || !bus_fee_structure_id || !amount_paid) {
      throw new BadRequestException('Missing required fields');
    }

    // Check existing payments
    const existingPayments = await this.prisma.busFeePayment.findMany({
      where: { student_id, bus_fee_structure_id },
      select: { amount_paid: true },
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const structure = await this.prisma.busFeeStructure.findUnique({
      where: { id: Number(bus_fee_structure_id) },
      select: { total_amount: true },
    });

    if (!structure) throw new NotFoundException('Bus Fee Structure not found');

    const newTotal = totalPaid + Number(amount_paid);
    let status: BusFeesStatus = BusFeesStatus.PENDING;


    if (newTotal == structure.total_amount) status = BusFeesStatus.PAID;
    else if (newTotal > 0 && newTotal < structure.total_amount)
      status = BusFeesStatus.PARTIALLY_PAID;

    const payment = await this.prisma.busFeePayment.create({
      data: {
        school_id: Number(school_id),
        class_id: Number(class_id),
        student_id: student_id.toString(),
        bus_fee_structure_id: Number(bus_fee_structure_id),
        amount_paid: Number(amount_paid),
        payment_mode,
        reference_number,
        remarks,
        created_by,
        updated_by: created_by,
        status,
        payment_date,
      },
    });

    return { status: 'success', data: payment };
  }

  // 🟢 GET ALL PAYMENTS
  async findAll() {
    return this.prisma.busFeePayment.findMany({
      include: {
        student: true,
        busFeeStructure: true,
        // school: true,
        classes: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // 🟢 GET ONE BY ID
  async findOne(id: number) {
    const record = await this.prisma.busFeePayment.findUnique({
      where: { id },
      include: {
        student: true,
        busFeeStructure: true,
        // school: true,
        classes: true,
      },
    });

    if (!record) throw new NotFoundException('Bus Fee Payment not found');
    return record;
  }

  // 🟢 UPDATE PAYMENT
  async update(id: number, data: any) {
    const existing = await this.prisma.busFeePayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.busFeePayment.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return { status: 'success', data: updated };
  }

  // 🟢 DELETE PAYMENT
  async remove(id: number) {
    const exists = await this.prisma.busFeePayment.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Record not found');

    await this.prisma.busFeePayment.delete({ where: { id } });
    return { status: 'success', message: `Deleted payment ID ${id}` };
  }

  // 🟢 FIND BY STUDENT (existing)
  async findByStudent(student_id: string, school_id: number) {
    const data = await this.prisma.busFeePayment.findMany({
      where: { student_id, school_id },
      include: { busFeeStructure: true, student: true, classes: true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }

  // 🟣 FIND BY SCHOOL
  async findBySchool(school_id: number) {
    const data = await this.prisma.busFeePayment.findMany({
      where: { school_id },
      include: { student: true, busFeeStructure: true, classes: true, admin: true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }


 async findPendingPaidBySchool(school_id: number) {
  // 1️⃣ Get all active bus fee structures
  const totalBusFees = await this.prisma.busFeeStructure.findMany({
    where: { school_id, status: 'active' },
    select: {
      id: true,
      route: true,
      term: true,
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

  // 3️⃣ Loop through each bus fee route
  for (const busFee of totalBusFees) {
    const students = await this.prisma.student.findMany({
      where: {
        school_id,
        route: busFee.route,
      },
      select: {
        username: true,
        name: true,
        class_id: true,
        mobile: true,
      },
    });

    allStudents[busFee.route] = students;
    totalStudents[busFee.route] = students.length;
    paidStudents[busFee.route] = [];
    pendingStudents[busFee.route] = [];
    paidAmounts[busFee.route] = 0;
    pendingAmounts[busFee.route] = 0;

    for (const student of students) {
      const paidPayments = await this.prisma.busFeePayment.findMany({
        where: {
          bus_fee_structure_id: busFee.id,
          student_id: student.username,
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        select: {
          amount_paid: true,
        },
      });

      const totalPaidAmount = paidPayments.reduce(
        (sum, p) => sum + Number(p.amount_paid || 0),
        0
      );

      // 🟢 Fully paid
      if (totalPaidAmount >= Number(busFee.total_amount)) {
        paidStudents[busFee.route].push({
          ...student,
          totalPaidAmount,
          status: 'PAID',
        });
        paidAmounts[busFee.route] += totalPaidAmount;
      } else {
        // 🔴 Pending
        pendingStudents[busFee.route].push({
          ...student,
          totalPaidAmount,
          pendingAmount: Number(busFee.total_amount) - totalPaidAmount,
          status: totalPaidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        });
        paidAmounts[busFee.route] += totalPaidAmount;
        pendingAmounts[busFee.route] +=
          Number(busFee.total_amount) - totalPaidAmount;
      }
    }
  }

  // 4️⃣ Totals across all routes
  const totalPaidAmount = Object.values(paidAmounts).reduce(
    (sum, a) => sum + a,
    0
  );
  const totalPendingAmount = Object.values(pendingAmounts).reduce(
    (sum, a) => sum + a,
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

  // 5️⃣ Return
  return {
  //  busFees: totalBusFees,
    totalBusFees: totalBusFees.length,
   // allStudents,
   
   // paidStudents,
   // pendingStudents,
   // paidAmounts,
   // pendingAmounts,
    totalPaidAmount,
    totalPendingAmount,
    totalAmount:Number(totalPaidAmount)+Number(totalPendingAmount),
    totalPaidStudents,
    totalPendingStudents,
     totalStudents:Number(totalPendingStudents)+Number(totalPaidStudents),
  };
}


 async findBySchoolClassAndDate(school_id: number,class_id:number, payment_date: string) {
    const startOfDay = new Date(payment_date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(payment_date);
    endOfDay.setHours(23, 59, 59, 999);
    const data = await this.prisma.busFeePayment.findMany({
      where: {
        school_id,class_id, payment_date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      include: { student: true, busFeeStructure: true, classes: true, admin: true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }


  async findBySchoolAndDate(school_id: number, payment_date: string) {
    const startOfDay = new Date(payment_date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(payment_date);
    endOfDay.setHours(23, 59, 59, 999);
    const data = await this.prisma.busFeePayment.findMany({
      where: {
        school_id, payment_date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      include: { student: true, busFeeStructure: true, classes: true, admin: true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }
  // 🟡 FIND BY SCHOOL + CLASS
  async findBySchoolAndClass(school_id: number, class_id: number) {
    const data = await this.prisma.busFeePayment.findMany({
      where: { school_id, class_id },
      select: {
        id: true, school_id: true, class_id: true, bus_fee_structure_id: true,
        payment_date: true, amount_paid: true, payment_mode: true, status: true, created_by: true,
        student_id:true,
        busFeeStructure: {
          select: {
            id: true,
            route: true,
            term: true,
            total_amount: true,
            status: true,

          }
        },
        admin: {
          select: {
            name: true, designation: true, username: true,
          }
        }
      },
      // include: {// student: true,
      //    busFeeStructure: true,admin:true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }

  // 🟠 FIND BY SCHOOL + CLASS + STUDENT
  async findBySchoolClassAndStudent(
    school_id: number,
    class_id: number,
    student_id: string,
  ) {
    const data = await this.prisma.busFeePayment.findMany({
      where: { school_id, class_id, student_id },
      include: { student: true, busFeeStructure: true, classes: true, admin: true },
      orderBy: { created_at: 'desc' },
    });
    return { status: 'success', payments: data };
  }
}
