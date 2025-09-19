import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) { }

  async fetchHomeworkByClassId(schoolId: number, classId: number) {
    return this.prisma.homework.findMany({
      where: { school_id: Number(schoolId), class_id: Number(classId) },
      orderBy: {
        id: 'desc',
      },
    });
  }
  async fetchHomeworkByStaff(schoolId: number, classId: number, staff: string) {


    return this.prisma.homework.findMany({
      where: {
        school_id: schoolId,
        class_id: classId,
        ...(staff ? { assigned_by: staff } : {})
      },
      orderBy: { id: 'desc' },
    });
  }
async deleteHomeworkById(id: number) {
  const exist = await this.prisma.homework.findUnique({
    where: { id: Number(id) },
  });

  if (!exist) {
    throw new BadRequestException('Invalid id');
  }

  return this.prisma.homework.delete({
    where: { id: Number(id) },
  });
}
async create(data: CreateHomeworkDto) {
  return this.prisma.homework.create({
    data: {
      ...data,
      assigned_date: new Date(data.assigned_date),
      due_date: new Date(data.due_date),
    },
  });
}

} 