import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StudentFeesStatus } from '@prisma/client'; // ensure you have this enum defined in schema
import { tr } from 'date-fns/locale';
import { join } from 'path';

@Injectable()
export class StudentFeesService {
  constructor(private readonly prisma: PrismaService) { }

  async assignStudentFees(schoolId: number, classId: number, username: string, id: number, createdBy: string) {
    const structures = await this.prisma.feeStructure.findMany({
      where: { school_id: schoolId, class_id: classId, status: 'active', id },
    });

    if (!structures.length) {
      throw new NotFoundException('No active fee structure found for this class');
    }

    const total = structures.reduce((sum, f) => sum + Number(f.total_amount), 0);

    return this.prisma.studentFees.create({
      data: {
        id: id,
        school_id: schoolId,
        class_id: classId,
        username,
        total_amount: total,
        paid_amount: 0,
        createdBy: createdBy,
        status: StudentFeesStatus.PENDING,
      },
    });
  }

  async recordPayment(studentFeeId: number, amount: number, method: string, transactionId?: string) {
    const studentFee = await this.prisma.studentFees.findUnique({
      where: { aId: studentFeeId },
    });

    if (!studentFee) throw new NotFoundException('Student fee record not found');

    // Create a new payment record
    const payment = await this.prisma.feePayments.create({
      data: {
        student_fee_id: studentFeeId,
        amount,
        method,
        transaction_id: transactionId ?? null,
      },
    });

    const newPaid = studentFee.paid_amount + amount;
    const status =
      newPaid >= studentFee.total_amount
        ? StudentFeesStatus.PAID
        : newPaid > 0
          ? StudentFeesStatus.PARTIALLY_PAID
          : StudentFeesStatus.PENDING;

    // Update the student fee progress
    await this.prisma.studentFees.update({
      where: { aId: studentFeeId },
      data: {
        paid_amount: newPaid,
        status,

      },
    });

    return payment;
  }

  async getStudentFee(username: string, schoolId: number, classId: number) {
    return this.prisma.studentFees.findMany({
      where: { username, school_id: Number(schoolId), class_id: Number(classId) },
      include: { payments: true, admin: true },
    });
  }

  async getFeesByClass(schoolId: number, classId: number) {
    return this.prisma.studentFees.findMany({
      where: { school_id: Number(schoolId), class_id: Number(classId) },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        payments: true, user: {
          select: {
            id: true,
            username: true,
            name: true,
            gender: true,
            email: true,
            mobile: true,
            class_id: true,
            school_id: true,
            route: true,
          }
        }, admin: true
      },
    });
  }
  async getPaidFeesByClass(schoolId: number, classId: number) {
    return this.prisma.studentFees.findMany({
      where: {
        school_id: Number(schoolId), class_id: Number(classId), status: {
          in: ['PAID', 'PARTIALLY_PAID']
        },
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        payments: true, user: {
          select: {
            id: true,
            username: true,
            name: true,
            gender: true,
            email: true,
            mobile: true,
            class_id: true,
            school_id: true,
            route: true,
          }
        }, admin: true, feeStructure: true
      },
    });
  }

async getPaidFeesBySchool(schoolId: number) {
  // 1️⃣ Get active classes
  const feeClasses = await this.prisma.feeStructure.findMany({
    where: {
      school_id: Number(schoolId),
      status: 'active',
    },
    distinct: ['class_id'],
    select: {
      class_id: true,
      class: {
        select: {
          class: true,
          section: true,
        }
      },
    },
  });

  // Initialize all result containers
  const classStudent = {};
  const classPaidStudent = {};
  const classPaidAmount = {};
  const classPendingAmount = {};
  const pendingStudents = {};

  // 2️⃣ Get all active fee structures
  const allFees = await this.prisma.feeStructure.findMany({
    where: {
      school_id: Number(schoolId),
      status: 'active',
    },
    orderBy: {
      class_id: 'asc',
    },
    select: {
      id: true,
      class_id: true,
      total_amount: true,
    },
  });

  // Loop through each class
  for (const cls of feeClasses) {
    const classId = cls.class_id;
    const classLabel = `${cls.class.class}-${cls.class.section}`; // 👈 KEY FIX

    // 3️⃣ Count students in the class
    const classStu = await this.prisma.student.findMany({
      where: {
        school_id: Number(schoolId),
        class_id: classId,
        isRTE:false,
      },
      select: { id: true },
    });

    classStudent[classLabel] = classStu.length;

    // Get fee structures for this class
    const classFees = allFees.filter(f => f.class_id === classId);
    const feeIds = classFees.map(f => f.id);
    const totalClassFeeAmount = classFees.reduce(
      (sum, f) => sum + Number(f.total_amount || 0),
      0
    );

    if (feeIds.length === 0) continue;

    // 4️⃣ Get students in this class
    const students = await this.prisma.student.findMany({
      where: {
        school_id: Number(schoolId),
        class_id: classId,
      },
      select: { username: true },
    });

    let paidStudentsCount = 0;
    let paidAmount = 0;

    // Loop over each student
    for (const stu of students) {
      // Fully paid fees
      const paidFees = await this.prisma.studentFees.findMany({
        where: {
          username: stu.username.toString(),
          class_id: classId,
          school_id: Number(schoolId),
          status: 'PAID',
        },
        select: {
          paid_amount: true,
          feeStructure: {
            select: { id: true },
          },
        },
      });

      // Partially paid fees
      const partiallyPaidFees = await this.prisma.studentFees.findMany({
        where: {
          username: stu.username.toString(),
          class_id: classId,
          school_id: Number(schoolId),
          status: 'PARTIALLY_PAID',
        },
        select: {
          paid_amount: true,
          feeStructure: {
            select: { id: true },
          },
        },
      });

      const fullyPaidSum = paidFees.reduce(
        (sum, p) => sum + Number(p.paid_amount || 0),
        0
      );

      const partialPaidSum = partiallyPaidFees.reduce(
        (sum, p) => sum + Number(p.paid_amount || 0),
        0
      );

      paidAmount += fullyPaidSum + partialPaidSum;

      const paidFeeIds = paidFees.map(p => p.feeStructure.id);
      const hasPaidAll = feeIds.every(id => paidFeeIds.includes(id));

      if (hasPaidAll) paidStudentsCount++;
    }

    // Save results using classLabel
    classPaidStudent[classLabel] = paidStudentsCount;
    classPaidAmount[classLabel] = paidAmount;

    const totalStudents = classStudent[classLabel] || 0;
    classPendingAmount[classLabel] =
      (totalStudents * totalClassFeeAmount) - paidAmount;

    pendingStudents[classLabel] =
      totalStudents - paidStudentsCount;
  }

  // 6️⃣ Totals
  let totalClassStudent = 0;
  let totalPaidStudent = 0;
  let totalPendingStudent = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;

  for (const cls of feeClasses) {
    const classLabel = `${cls.class.class}-${cls.class.section}`;

    totalClassStudent += Number(classStudent[classLabel] || 0);
    totalPaidStudent += Number(classPaidStudent[classLabel] || 0);
    totalPendingStudent += Number(pendingStudents[classLabel] || 0);
    totalPaidAmount += Number(classPaidAmount[classLabel] || 0);
    totalPendingAmount += Number(classPendingAmount[classLabel] || 0);
  }

  // 7️⃣ Final return
  return {
    totalClasses: feeClasses.length,
    classStudent,
    totalClassStudent,
    allFees: allFees.length,
    PaidStudents: classPaidStudent,
    totalPaidStudent,
    pendingStudents,
    totalPendingStudent,
    classPaidAmount,
    classPendingAmount,
    totalPaidAmount,
    totalPendingAmount,
    totalAmount: totalPaidAmount + totalPendingAmount,
  };
}

async getDailyPaidFeesClass(schoolId: number,class_id:number, date: Date) {

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.studentFees.findMany({
      where: {
        class_id:Number(class_id),
        school_id: Number(schoolId),
        status: {
          in: ['PAID', 'PARTIALLY_PAID']
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        class_id: 'asc',
      },
      include: {
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            gender: true,
            email: true,
            mobile: true,
            class_id: true,
            school_id: true,
            route: true,
          }
        },
        admin: true,
        feeStructure: true,
        class: true,
      },
    });
  }


  async getDailyPaidFees(schoolId: number, date: Date) {

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.studentFees.findMany({
      where: {
        school_id: Number(schoolId),
        status: {
          in: ['PAID', 'PARTIALLY_PAID']
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        class_id: 'asc',
      },
      include: {
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            gender: true,
            email: true,
            mobile: true,
            class_id: true,
            school_id: true,
            route: true,
          }
        },
        admin: true,
        feeStructure: true,
        class: true,
      },
    });
  }
  async getPeriodicalPaidFees(schoolId: number, startDate: Date, endDate: Date) {

    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.studentFees.findMany({
      where: {
        school_id: Number(schoolId),
        status: {
          in: ['PAID', 'PARTIALLY_PAID']
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        class_id: 'asc',
      },
      include: {
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            gender: true,
            email: true,
            mobile: true,
            class_id: true,
            school_id: true,
            route: true,
          }
        },
        admin: true,
        feeStructure: true,
        class: true,
      },
    });
  }
  /**
   * Update status manually (Admin use)
   */
  async updateFeeStatus(studentFeeId: number, status: StudentFeesStatus) {
    return this.prisma.studentFees.update({
      where: { aId: studentFeeId },
      data: { status },
    });
  }

 async getPendingFeeList(schoolId: number) {
  // 1️⃣ Find all classes in the school that have fee structures
  const classesWithFees = await this.prisma.classes.findMany({
    where: {
      school_id: schoolId,
      feeStructure: {
        some: {}, // class has at least one fee structure
      },
    },
    include: {
      feeStructure: true,
    },
  });

  // Map to hold classId => array of feeStructure ids for quick lookup
  const classFeeMap = new Map<number, number[]>();
  classesWithFees.forEach(cls => {
    classFeeMap.set(cls.id, cls.feeStructure.map(f => f.id));
  });

  const classIds = [...classFeeMap.keys()];

  // 2️⃣ Fetch all students of these classes with their studentFees and class info
  const students = await this.prisma.student.findMany({
    where: {
      school_id: schoolId,
      class_id: { in: classIds },
      isRTE:false,
    },
    select: {
      id: true,
      username: true,
      name: true,
      mobile: true,
      class_id: true,
      father_name: true,
      route: true,
      class: true,
      studentFees: {
        include: {
          feeStructure: {
            select: {
              id: true,
              school_id: true,
              class_id: true,
              title: true,
              descriptions: true,
              amounts: true,
              total_amount: true,
              status: true,
            },
          },
          payments: true,
        },
      },
    },
  });

  // 3️⃣ Filter students who have pending fees
  const pendingStudents = students.filter(student => {
    const feesForClass = classFeeMap.get(student.class_id) || [];

    // Use feeStructure.id from studentFee to map with feesForClass
    const studentFeeStructureIds = student.studentFees.map(sf => sf.feeStructure.id);

    // Check if any fee is PARTIALLY_PAID => include
    if (student.studentFees.some(sf => sf.status === 'PARTIALLY_PAID')) {
      return true;
    }

    // Check if student is missing any feeStructure in their studentFees => include
    const missingFees = feesForClass.some(feeId => !studentFeeStructureIds.includes(feeId));
    if (missingFees) {
      return true;
    }

    // If none partial and no missing fee => exclude (fully paid)
    return false;
  });

  // 4️⃣ Return combined result
  return {
    school_id: schoolId,
    totalPending: pendingStudents.length,
    students: pendingStudents,
    feeStructures: classesWithFees.flatMap(c => c.feeStructure),
  };
}

async getCountPendingFees(schoolId: number) {
  // 1️⃣ Find all classes in the school that have fee structures
  const classesWithFees = await this.prisma.classes.findMany({
    where: {
      school_id: schoolId,
      feeStructure: {
        some: {}, // class has at least one fee structure
      },
    },
    include: {
      feeStructure: true,
    },
  });

  // Map to hold classId => array of feeStructure ids for quick lookup
  const classFeeMap = new Map<number, number[]>();
  classesWithFees.forEach(cls => {
    classFeeMap.set(cls.id, cls.feeStructure.map(f => f.id));
  });

  const classIds = [...classFeeMap.keys()];

  // 2️⃣ Fetch all students of these classes with their studentFees and class info
  const students = await this.prisma.student.findMany({
    where: {
      school_id: schoolId,
      class_id: { in: classIds },
      isRTE:false,
    },
    select: {
      id: true,
      username: true,
      name: true,
      mobile: true,
      class_id: true,
      father_name: true,
      route: true,
      class: true,
      studentFees: {
        include: {
          feeStructure: {
            select: {
              id: true,
              school_id: true,
              class_id: true,
              title: true,
              descriptions: true,
              amounts: true,
              total_amount: true,
              status: true,
            },
          },
          payments: true,
        },
      },
    },
  });

  // 3️⃣ Filter students who have pending fees
  const pendingStudents = students.filter(student => {
    const feesForClass = classFeeMap.get(student.class_id) || [];

    // Use feeStructure.id from studentFee to map with feesForClass
    const studentFeeStructureIds = student.studentFees.map(sf => sf.feeStructure.id);

    // Check if any fee is PARTIALLY_PAID => include
    if (student.studentFees.some(sf => sf.status === 'PARTIALLY_PAID')) {
      return true;
    }

    // Check if student is missing any feeStructure in their studentFees => include
    const missingFees = feesForClass.some(feeId => !studentFeeStructureIds.includes(feeId));
    if (missingFees) {
      return true;
    }

    // If none partial and no missing fee => exclude (fully paid)
    return false;
  });

  // 4️⃣ Return combined result
  return {
    school_id: schoolId,
    totalPending: pendingStudents.length,
   // students: pendingStudents.length,
   feeStructures: classesWithFees.flatMap(c => c.feeStructure).length,
  };
}

}
