import { Injectable, InternalServerErrorException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { join } from 'path';
import * as fs from 'fs';

import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK BY CLASS
  // ────────────────────────────────────────────────
  async fetchHomeworkByClassId(schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).homework.findMany({
      where: { school_id: Number(schoolId), class_id: Number(classId) },
      orderBy: { id: 'desc' },
    });
  }

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK BY STAFF
  // ────────────────────────────────────────────────
  async fetchHomeworkByStaff(schoolId: number, classId: number, staff?: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).homework.findMany({
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
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).homework.create({
      data: {
        ...data,
        school_id: Number(data.school_id),
        class_id: Number(data.class_id),
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

    const client = this.dbConfig.getDatabaseClient(this.request);

    return (client as any).homework.create({
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
    const client = this.dbConfig.getDatabaseClient(this.request);

    const homework = await (client as any).homework.findUnique({
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

    return (client as any).homework.delete({
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
