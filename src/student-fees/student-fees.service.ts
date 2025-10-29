import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StudentFeesService {
  constructor(private prisma: PrismaService) {}
 async getStudentFee(username: string, schoolId: number,classId : number) {
    return this.prisma.studentFees.findMany({
      where: { username, school_id: Number(schoolId) ,class_id:Number(classId)},
      include: { payments: true },
    });
  }
  async getAll() {
    return this.prisma.studentFees.findMany({
      include: { payments: true, class: true, school: true, user: true },
    });
  }

  async getById(id: number) {
    return this.prisma.studentFees.findUnique({
      where: { aId:id },
      include: { payments: true, class: true, school: true, user: true },
    });
  }

  async createStudentFee(data: any) {
  return this.prisma.studentFees.create({
    data: {
      id: data.id, // business id
      school_id: data.school_id,
      class_id: data.class_id,
      username: data.username,
      total_amount: data.total_amount,
      paid_amount: data.paid_amount || 0,
      status: data.status, // should be one of StudentFeesStatus enum values
      createdBy: data.createdBy,
      remarks: data.remarks,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    },
  });
}


  async update(id: number, data: any) {
    return this.prisma.studentFees.update({
      where: {  aId:id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.studentFees.delete({
      where: {  aId:id },
    });
  }
}
