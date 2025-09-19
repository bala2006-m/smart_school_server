import { Controller, Get, Query,NotFoundException,Post,Body,Param, } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { FetchClassIdDto} from './dto/fetch-class-id.dto';
import { AddClassDto } from './dto/add-class.dto';
import { DeleteClassDto } from './dto/delete-class.dto';

@Controller('class')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}
 @Get('all/:schoolId')
  async getAllClassesBySchool(@Param('schoolId') schoolId: string) {
    return this.classesService.getAllClassesBySchool(parseInt(schoolId));
  }
 @Get('get-name')
  async getClassNameByIdAndSchool(
    @Query('class_id') classId: string,
    @Query('school_id') schoolId: string,
  ) {
    const result = await this.classesService.findClassName(+classId, +schoolId);
    return {
      status: 'success',
      data: result,
    };
  }
@Post('add')
  async addClass(@Body() dto: AddClassDto) {
    return this.classesService.addClass(dto);
  }
  @Post('delete')
    async deleteClass(@Body() dto: DeleteClassDto) {
      return this.classesService.deleteClass(dto);
    }
  @Get('get_class_data')
  async getClassData(
    @Query('school_id') schoolId: string,
    @Query('class_id') classId: string,
  ) {
    if (!schoolId || !classId) {
      return {
        status: 'error',
        message: 'school_id and class_id are required',
      };
    }

    try {
      const classData = await this.classesService.getClassData(
        parseInt(schoolId, 10),
        parseInt(classId, 10),
      );

      return {
        status: 'success',
        class: classData,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to fetch class data',
        details: error.message,
      };
    }
  }

  // GET /class/fetch_class_data?school_id=1
  @Get('fetch_class_data')
  async fetchClassData(@Query('school_id') schoolId: string) {
    if (!schoolId) {
      return {
        status: 'error',
        message: 'school_id is required',
      };
    }

    try {
      const classes = await this.classesService.fetchClassData(parseInt(schoolId, 10));

      return {
        status: 'success',
        classes,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to fetch classes',
        details: error.message,
      };
    }
  }
  @Get('fetch_class_id')
  async fetchClassId(@Query() query: FetchClassIdDto) {
    const { school_id, class: className, section } = query;

    const classId = await this.classesService.findClassId(school_id.toString(), className.toString(), section);

    if (!classId) {
      throw new NotFoundException('Class not found');
    }

    return {
      status: 'success',
      class_id: classId,
    };
  }

}
