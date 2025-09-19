import { Controller, Get, Param, ParseIntPipe, Post, Body ,Delete} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) { }

  @Get('fetch_homework_by_class_id/:school_id/:class_id')
  async fetchHomeworkByClassId(@Param('school_id') schoolId: number, @Param('class_id') classId: number) {
    return this.homeworkService.fetchHomeworkByClassId(schoolId, classId);
  }


  @Get('fetch_homework_by_staff/:school_id/:class_id/:staff')
  async fetchHomeworkByStaff(
    @Param('school_id') schoolId: number,
    @Param('class_id') classId: number,

    @Param('staff') staff: string
  ) {
    return this.homeworkService.fetchHomeworkByStaff(Number(schoolId), Number(classId), staff);
  }
@Delete('delete_homework_by_id/:id')
async deleteHomework(@Param('id') id: string) {
  return this.homeworkService.deleteHomeworkById(Number(id));
}


 @Post('create')
  create(@Body() createHomeworkDto: CreateHomeworkDto) {
    return this.homeworkService.create(createHomeworkDto);
  }
}
