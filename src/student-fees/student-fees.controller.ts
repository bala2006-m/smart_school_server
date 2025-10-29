import { Controller, Get, Param, Post, Body, Put, Delete ,Query} from '@nestjs/common';
import { StudentFeesService } from './student-fees.service';

@Controller('student-fees-payments')
export class StudentFeesController {
  constructor(private readonly service: StudentFeesService) {}
@Get('fetch_by_username')
  async getStudentFee(
    @Query('username') username: string,
    @Query('schoolId') schoolId: number,
     @Query('classId') classId: number,
  ) {
    return this.service.getStudentFee(username, schoolId,classId);
  }
  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.service.getById(Number(id));
  }

  @Post()
  async create(@Body() data: any) {
    return this.service.createStudentFee(data);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.service.delete(Number(id));
  }
}
