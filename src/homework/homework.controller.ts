import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK FOR CLASS
  // ────────────────────────────────────────────────
  @Get('class/:schoolId/:classId')
  async fetchHomeworkByClassId(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    return this.homeworkService.fetchHomeworkByClassId(schoolId, classId);
  }

  // ────────────────────────────────────────────────
  // FETCH HOMEWORK BY STAFF
  // ────────────────────────────────────────────────
  @Get('staff/:schoolId/:classId/:staff')
  async fetchHomeworkByStaff(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Param('staff') staff: string,
  ) {
    return this.homeworkService.fetchHomeworkByStaff(
      schoolId,
      classId,
      staff,
    );
  }

  // ────────────────────────────────────────────────
  // CREATE HOMEWORK (WITHOUT FILE)
  // ────────────────────────────────────────────────
  @Post('create')
  async create(@Body() createHomeworkDto: CreateHomeworkDto) {
    return this.homeworkService.create(createHomeworkDto);
  }

  // ────────────────────────────────────────────────
  // CREATE HOMEWORK WITH FILE (IMAGE/PDF/ETC)
  // ────────────────────────────────────────────────
 @Post('create_with_file/:schoolId/:classId')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const schoolId = req.params.schoolId;
        const classId = req.params.classId;

        if (!schoolId || !classId) {
          return callback(new Error('Missing schoolId or classId'), '');
        }

        const uploadPath = join('/var/www/images/homework', schoolId, classId);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, uniqueName + ext);
      },
    }),
  }),
)
async createWithFile(
  @Body() data: CreateHomeworkDto,
  @Param('schoolId') schoolId: string,
  @Param('classId') classId: string,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.homeworkService.createWithFile(data, schoolId, classId, file);
}


  // ────────────────────────────────────────────────
  // DELETE HOMEWORK BY ID (also deletes file)
  // ────────────────────────────────────────────────
  @Delete('delete/:id')
  async deleteHomework(@Param('id', ParseIntPipe) id: number) {
    return this.homeworkService.deleteHomeworkById(id);
  }

  // ────────────────────────────────────────────────
  // DELETE A SINGLE IMAGE FROM FOLDER
  // ────────────────────────────────────────────────
  @Delete('delete-image/:schoolId/:classId/:filename')
  async deleteImage(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Param('filename') filename: string,
  ) {
    return this.homeworkService.deleteImage(schoolId, classId, filename);
  }
}
