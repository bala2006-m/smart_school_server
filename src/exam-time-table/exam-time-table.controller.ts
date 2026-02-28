import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ExamTimeTableService } from './exam-time-table.service';
import { Prisma } from '@prisma/client';

@Controller('exam-time-table')
export class ExamTimeTableController {
  constructor(private readonly service: ExamTimeTableService) {}

  // Create
  @Post()
  create(@Body() data: Prisma.ExamTimeTableCreateInput) {
    return this.service.create(data);
  }

  // Get All
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Get By School & Class
  @Get('filter')
  findBySchoolAndClass(
    @Query('school_id', ParseIntPipe) school_id: number,
    @Query('class_id', ParseIntPipe) class_id: number,
  ) {
    return this.service.findBySchoolAndClass(school_id, class_id);
  }

  // Get One
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // Update
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.ExamTimeTableUpdateInput,
  ) {
    return this.service.update(id, data);
  }

  // Delete
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
