import { Controller, Get, Query,Post,Body,Patch,Param,Delete } from '@nestjs/common';
import { ClassTimetableService } from './class-timetable.service';
import { SaveTimetableDto } from './dto/timetable.dto';

@Controller('timetable')
export class ClassTimetableController {
  constructor(private readonly timetableService: ClassTimetableService) {}
  
 @Post('create')
  async save(@Body() body: { data: string }) {
    console.log('its work');
    
    return this.timetableService.saveTimetables(body.data);
  }
  @Get()
  async getTimetable(
    @Query('schoolId') schoolIdStr: string,
    @Query('classId') classIdStr: string,
  ) {
    
    const schoolId = parseInt(schoolIdStr);
    const classId = parseInt(classIdStr);

    if (isNaN(schoolId) || isNaN(classId)) {
      return { status: 'error', message: 'Invalid schoolId or classId' };
    }

    const result = await this.timetableService.getTimetable(schoolId, classId);
    return { status: 'success', timetable: result };
  }
@Delete('delete/:id')
async delete(@Param('id') id: string) {
 

  try {
    const result = await this.timetableService.delete(id);

    if (!result) {
      return { status: 'fail', message: 'Timetable entry not found' };
    }

    return { status: 'success', message: 'Timetable entry deleted successfully' };
  } catch (error) {
  
    return { status: 'error', message: 'Failed to delete timetable entry' };
  }
}

//    @Put(':id')
//     async update(@Param('id') id: number, @Body() data: Partial<CreateTimetableDto>) {
//       return this.timetableService.update(+id, data);
//     }
//
   
}
