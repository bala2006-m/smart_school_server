import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK BY CLASS
  // ────────────────────────────────────────────────
  async fetchHomeworkByClassId(schoolId: number, classId: number) {
    return this.prisma.homework.findMany({
      where: { school_id: Number(schoolId), class_id: Number(classId) },
      orderBy: { id: 'desc' },
    });
  }

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK BY STAFF
  // ────────────────────────────────────────────────
  async fetchHomeworkByStaff(schoolId: number, classId: number, staff?: string) {
    return this.prisma.homework.findMany({
      where: {
        school_id: Number(schoolId),
        class_id: Number(classId),
        ...(staff ? { assigned_by: staff } : {}),
      },
      orderBy: { id: 'desc' },
    });
  }

  // ────────────────────────────────────────────────
  // CREATE HOMEWORK WITHOUT FILE
  // ────────────────────────────────────────────────
  async create(data: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        ...data,
        school_id:Number(data.school_id),
        class_id:Number(data.class_id),
        assigned_date: new Date(data.assigned_date),
        due_date: new Date(data.due_date),
        attachments: [],
      },
    });
  }

  // ────────────────────────────────────────────────
  // CREATE HOMEWORK WITH FILE UPLOAD
  // ────────────────────────────────────────────────
 async createWithFile(
  data: CreateHomeworkDto,
  schoolId: string,
  classId: string,
  file: Express.Multer.File,
) {
  if (!file) throw new BadRequestException('File is required');

  // File is already stored by Multer → Now just prepare URL
  const imageUrl = `https://smartschoolserver.ramchintech.com/images/homework/${schoolId}/${classId}/${file.filename}`;

  return this.prisma.homework.create({
    data: {
      ...data,
      school_id: Number(data.school_id),
      class_id: Number(data.class_id),
      assigned_date: new Date(data.assigned_date),
      due_date: new Date(data.due_date),
      attachments: [imageUrl],
    },
  });
}




  // ────────────────────────────────────────────────
  // DELETE HOMEWORK AND ATTACHED IMAGE FILES
  // ────────────────────────────────────────────────
  async deleteHomeworkById(id: number) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: Number(id) },
    });

    if (!homework) throw new BadRequestException('Invalid homework id');

    // Safely delete files if attachments exist
    if (Array.isArray(homework.attachments)) {
      for (const url of homework.attachments) {
        if (typeof url !== 'string') continue;

        const localPath = url.replace(
          'https://smartschoolserver.ramchintech.com',
          '/var/www',
        );

        if (fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath);
          } catch (err) {
            console.error('Failed to delete file:', localPath, err);
            throw new InternalServerErrorException(
              'Failed to delete attached file.',
            );
          }
        }
      }
    }

    return this.prisma.homework.delete({
      where: { id: Number(id) },
    });
  }

  // ────────────────────────────────────────────────
  // DELETE SINGLE IMAGE FILE FROM FOLDER
  // ────────────────────────────────────────────────
  async deleteImage(schoolId: string, classId: string, filename: string) {
    const filePath = join(
      '/var/www/images/homework',
      schoolId,
      classId,
      filename,
    );

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        throw new InternalServerErrorException('Failed to delete image file');
      }
    }

    return { message: 'Image deleted successfully' };
  }
}
