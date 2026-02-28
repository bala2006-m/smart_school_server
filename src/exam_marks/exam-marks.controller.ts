import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,Put,
  ParseIntPipe,
  HttpCode,
  HttpStatus,HttpException,
} from '@nestjs/common';
import { ExamMarksService } from './exam-marks.service';
import { CreateExamMarkDto } from './dto/create-exam-marks.dto';
import { UpdateExamMarkDto } from './dto/update-exam-mark.dto';
import { Prisma } from '@prisma/client';

@Controller('exam-marks')
export class ExamMarksController {
  constructor(private readonly examMarksService: ExamMarksService) {}
 @Put(':schoolId/:classId/:username/:title')
  async updateExamMarks(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Param('username') username: string,
    @Param('title') title: string,
    @Body() updateData: Prisma.ExamMarksUpdateInput,
  ) {
    const school_id = parseInt(schoolId);
    const class_id = parseInt(classId);

    if (isNaN(school_id) || isNaN(class_id)) {
      throw new HttpException('Invalid schoolId or classId', HttpStatus.BAD_REQUEST);
    }

    try {
      const updated = await this.examMarksService.updateBySchoolIdClassIdUsernameTitle(
        school_id,
        class_id,
        username,
        title,
        updateData,
      );
      return { message: 'Exam marks updated successfully', data: updated };
    } catch (error) {
      throw new HttpException(error.message || 'Update failed', HttpStatus.BAD_REQUEST);
    }
  }
  // ✅ Create exam mark
  @Post('create')
  async create(@Body() createExamMarkDto: CreateExamMarkDto) {
    return this.examMarksService.create(createExamMarkDto);
  }

  // ✅ Flexible fetch endpoint (by school, class, username, or combinations)
  @Get('fetch')
  async findAll(
    @Query('school_id') schoolId?: string,
    @Query('class_id') classId?: string,
    @Query('username') username?: string,
     @Query('title') title?: string,

  ) {
    return this.examMarksService.findAll({
      schoolId: schoolId ? Number(schoolId) : undefined,
      classId: classId ? Number(classId) : undefined,
      username,
      title
    });
  }

   @Get('fetch_classes')
  async findAllClasses(
    @Query('school_id') schoolId: string,
     @Query('title') title: string,

  ) {
    return this.examMarksService.findAllClasses({
      schoolId: Number(schoolId) ,
      title
    });
  }
@Get('fetch_titles')
  async findTitles(
    @Query('school_id') schoolId?: string,
    @Query('class_id') classId?: string,

  ) {
    return this.examMarksService.findTitles({
      schoolId: schoolId ? Number(schoolId) : undefined,
      classId: classId ? Number(classId) : undefined,
  
    });
  }
  // ✅ Update exam mark by ID
  @Patch('update_by_id/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamMarkDto: UpdateExamMarkDto,
  ) {
    return this.examMarksService.update(id, updateExamMarkDto);
  }

  
 @Patch('update_status_by_id/:id/:status')
  async updateById(
    @Param('id', ParseIntPipe) id: number,
    @Param('status') status: string,
  ) {
    return this.examMarksService.updateById(id,status);
  }


   @Patch('update_status_by_school_id_class_id/:school_id/:class_id/:status')
  async updateStatus(
    @Param('school_id') school_id: string,
     @Param('class_id') class_id: string,
     @Param('status') status: string,
  ) {
    return this.examMarksService.updateStatus(Number(school_id),Number(class_id),status );
  }

  // ✅ Delete exam mark by ID
  @Delete('delete_by_id/:id')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 on successful delete
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.examMarksService.remove(id);
  }
}
