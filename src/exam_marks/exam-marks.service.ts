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
  // async findAll(filters: {
  //   schoolId?: number;
  //   classId?: number;
  //   username?: string;
  //   title?: string;
  // }) {
  //   const where: any = {};

  //   if (filters.schoolId) where.school_id = filters.schoolId;
  //   if (filters.classId) where.class_id = filters.classId;
  //   if (filters.username) where.username = filters.username;
  //    if (filters.title) where.title = filters.title;

  //   const examMarks = await this.prisma.examMarks.findMany({
  //     where,
  //     orderBy: {
  //       created_at: 'asc',
  //     },
  //   });

  //   if (examMarks.length === 0) {
  //     throw new NotFoundException(`No exam marks found for the given filters`);
  //   }

  //   return examMarks;
  // }

  
  //  //i want [{"id":77,"school_id":62230201,"class_id":9,"class_name":"LKG","section":"A","username":"1571","title":"SEPT","min_max_marks":[35,100],"marks":["29"],"subjects":["tam"],"subject_rank":[-1],"rank":"","created_by":"9976248499","created_at":"2025-10-04T11:23:44.511Z","updated_by":"9976248499","updated_at":"2025-10-04T11:23:44.511Z","status":"inactive","date":"2025-09-26T00:00:00.000Z","session":"FN"}]
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

  // Fetch exam marks
  const examMarks = await this.prisma.examMarks.findMany({
    where,
    orderBy: { created_at: 'asc' },
  });

  if (examMarks.length === 0) {
    throw new NotFoundException(`No exam marks found for the given filters`);
  }

  // Extract unique class_ids and usernames for batch fetching
  const classIds = Array.from(new Set(examMarks.map(e => e.class_id)));
  const usernames = Array.from(new Set(examMarks.map(e => e.username)));
  const schoolIds = Array.from(new Set(examMarks.map(e => e.school_id)));

  // Fetch all students in one query
  const students = await this.prisma.student.findMany({
    where: {
      username: { in: usernames },
      school_id: { in: schoolIds },
    },
    select: { username: true, school_id: true, name: true },
  });

  // Create a map for fast lookup
  const studentMap = new Map(
    students.map(s => [`${s.username}_${s.school_id}`, s.name])
  );

  // Fetch class info in batch
  const classes = await this.prisma.classes.findMany({
    where: {
      id: { in: classIds },
      school_id: { in: schoolIds },
    },
    select: { id: true, school_id: true, class: true, section: true },
  });

  const classMap = new Map(
    classes.map(c => [`${c.id}_${c.school_id}`, { class_name: c.class, section: c.section }])
  );

  // Enrich exam marks
  const enrichedExamMarks = examMarks.map(exam => ({
    ...exam,
    name: studentMap.get(`${exam.username}_${exam.school_id}`) || null,
    class_name: classMap.get(`${exam.class_id}_${exam.school_id}`)?.class_name || '',
    section: classMap.get(`${exam.class_id}_${exam.school_id}`)?.section || '',
  }));

  return enrichedExamMarks;
}

async findClassName(classId: number, schoolId: number) {
    const cls = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        school_id: schoolId,
      },
      select: {
        class: true,
        section: true,
      },
    });

    if (!cls) {
      throw new NotFoundException('Class not found for given class_id and school_id');
    }

    return {
      class: cls.class,
      section: cls.section,
    };
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
