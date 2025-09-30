import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateExamMarkDto } from './dto/create-exam-marks.dto';
import { UpdateExamMarkDto } from './dto/update-exam-mark.dto';
import { Prisma } from '@prisma/client';
import { title } from 'process';

@Injectable()
export class ExamMarksService {
  constructor(private prisma: PrismaService) {}
async updateBySchoolIdClassIdUsernameTitle(
    school_id: number,
    class_id: number,
    username: string,
    title: string,
    data: Prisma.ExamMarksUpdateInput,
  ){
    return this.prisma.examMarks.update({
      where: {
        // Uses the unique constraint defined in your model
        unique_exam_per_student: {
          school_id,
          class_id,
          username,
          title,
        },
      },
      data,
    });
  }
  // ✅ Create a new exam mark
 async create(data: CreateExamMarkDto) {
    try {
      const newExamMark = await this.prisma.examMarks.create({ data });
      return newExamMark;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unique constraint violation on composite fields
        return 'An exam mark with this title already exists for this student in this school and class.';
      }
      return error; // rethrow other errors
    }
  }

  // ✅ Flexible fetch method (handles all queries)
  async findAll(filters: {
    schoolId?: number;
    classId?: number;
    username?: string;
    title?: string;
  }) {
    const where: any = {};

    if (filters.schoolId) where.school_id = filters.schoolId;
    if (filters.classId) where.class_id = filters.classId;
    if (filters.username) where.username = filters.username;
     if (filters.title) where.title = filters.title;

    const examMarks = await this.prisma.examMarks.findMany({
      where,
      orderBy: {
        created_at: 'asc',
      },
    });

    if (examMarks.length === 0) {
      throw new NotFoundException(`No exam marks found for the given filters`);
    }

    return examMarks;
  }
 async findTitles(filters: {
    schoolId?: number;
    classId?: number;

  }) {
    const where: any = {};

    if (filters.schoolId) where.school_id = filters.schoolId;
    if (filters.classId) where.class_id = filters.classId;
   
   const examMarks = await this.prisma.examMarks.findMany({
  where,
  select: {
    title: true
  },
  distinct: ['title'],
  orderBy: {
    created_at: 'asc'
  }
});


    if (examMarks.length === 0) {
      throw new NotFoundException(`No exam marks found for the given filters`);
    }

    return examMarks;
  }
  // ✅ Update an exam mark by ID
  async update(id: number, data: UpdateExamMarkDto) {
    const exists = await this.prisma.examMarks.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`ExamMark #${id} not found`);

    return this.prisma.examMarks.update({
      where: { id },
      data,
    });
  }
   async updateById(id: number,status:string) {
    const exists = await this.prisma.examMarks.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`ExamMark #${id} not found`);

    return this.prisma.examMarks.update({
      where: { id },
      data:{
        status
      },
    });
  }
 async updateStatus(school_id: number, class_id: number, status: string) {
 // Find existing marks for the school and class
 const exists = await this.prisma.examMarks.findMany({ where: { school_id, class_id } });
if (exists.length === 0) {
 throw new NotFoundException(`ExamMarks for school_id ${school_id} and class_id ${class_id} not found`);
 }

 // Update status for all matched records
 return this.prisma.examMarks.updateMany({
 where: { school_id, class_id },
data: { status }
 });
}

  // ✅ Delete an exam mark by ID
  async remove(id: number) {
    const exists = await this.prisma.examMarks.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`ExamMark #${id} not found`);

    return this.prisma.examMarks.delete({ where: { id } });
  }
}
