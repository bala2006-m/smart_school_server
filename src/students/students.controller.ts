import { BadRequestException ,Body, Post, Controller, Get,Delete,Put, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}
@Get('periodical-report-all')
  async periodicalReportAll(@Query('schoolId') username: string,@Query('fromDate') from: string,@Query('toDate') to: string) {
    return this.studentsService.getCombinedStudentReport(username,from,to);
  }


@Get('fetch_all_student_data_with_class')
  async fetchAllStudentsClassID(@Query('school_id') schoolId?: string) {
    return this.studentsService.getStudentsWithFlatClassData(schoolId);
  }


@Get('fetch_student_routs')
  async fetchStudentsRouts(@Query('school_id') schoolId: number,@Query('class_id') classId: number) {
    return this.studentsService.fetchStudentsRouts(schoolId,classId);
  }
@Get('fetch_student_routs_school')
  async fetchStudentsRoutsSchool(@Query('school_id') schoolId: number) {
    return this.studentsService.fetchStudentsRoutsSchool(schoolId);
  }

  @Get('fetch_rte_student_school')
  async fetchRteStudentsSchool(@Query('school_id') schoolId: number) {
    return this.studentsService.fetchRteStudentsSchool(schoolId);
  }
 @Get('fetch_bus_student_school')
  async fetchBusStudentsSchool(@Query('school_id') schoolId: number) {
    return this.studentsService.fetchBusStudentsSchool(schoolId);
  }
@Get('fetch_unique_routs')
  async fetchUniqueRouts(@Query('school_id') schoolId: number) {
    return this.studentsService.fetchUniqueRouts(schoolId);
  }
 @Get('school-class')
  async getSchoolAndClass(@Query('username') username: string,@Query('school_id') school_id: number) {
    return this.studentsService.getSchoolAndClassByUsername(username,school_id);
  }


  @Put('update')
async updateStudent(
  @Query('username') username: string,@Query('school_id') school_id: string,
  @Body() dto: UpdateStudentDto,
) {
  if (!username) {
    return { status: 'error', message: 'Missing username' };
  }

  return this.studentsService.updateStudent(username,dto,school_id);
}



@Get('fetch_all_student_data')
  async fetchAllStudents(@Query('school_id') schoolId?: string) {
    return this.studentsService.getAllStudents(schoolId);
  }


  
  @Get('by-username')
  async getStudentByUsername(@Query('username') username: string,@Query('school_id') school_id: number) {
    try {
      if (!username) {
        return { status: 'error', message: 'Missing or empty username' };
      }

      return await this.studentsService.findByUsername(username,school_id);
    } catch (error) {
      console.error('Error in getStudentByUsername:', error); // <-- this is what we need
      return { status: 'error', message: 'Internal server error' };
    }
  }


  @Post('register')
    async registerStudent(@Body() dto: RegisterStudentDto) {
      return this.studentsService.registerStudent(dto);
    }
 @Delete('delete')
  async deleteStudent(@Query('username') username: string,@Query('school_id') school_id: number) {
    if (!username) {
      return { status: 'error', message: 'Missing username' };
    }

    return this.studentsService.deleteStudent(username,school_id);
  }
 @Post('change-password')
   async changePassword(@Body() dto: ChangePasswordDto,@Query('school_id') school_id: number) {
     return this.studentsService.changeStudentPassword(dto,school_id);
   }
@Get('all-by-class')
  async getAllByClass(@Query('class_id') classId: string) {
    if (!classId) {
      return { status: 'error', message: 'Missing class_id' };
    }

    return this.studentsService.getAllByClass(classId);
  }


  @Get('fetch-student-data')
    async getAllByClassAndSchool(@Query('class_id') classId: string, @Query('school_id') schoolId: string ) {
      if (!classId||!schoolId) {
        return { status: 'error', message: 'Missing class_id or school_id' };
      }

      return this.studentsService.getAllByClass(classId);
    }

      @Get('fetch-non_rte_student-data')
    async getNonRteByClassAndSchool(@Query('class_id') classId: string, @Query('school_id') schoolId: string ) {
      if (!classId||!schoolId) {
        return { status: 'error', message: 'Missing class_id or school_id' };
      }

      return this.studentsService.getNonRteByClass(classId);
    }
@Get('count_student')
  async countStudents(@Query('school_id') schoolId?: string) {
    if (!schoolId) {
      throw new BadRequestException({
        status: 'failure',
        message: 'Missing or empty school_id',
      });
    }

    const id = parseInt(schoolId);
    if (isNaN(id)) {
      throw new BadRequestException({
        status: 'failure',
        message: 'Invalid school_id',
      });
    }

    const count = await this.studentsService.countStudentsBySchool(id);

    return {
      status: 'success',
      count,
    };
  }
  @Get('fetch_student_name')
    async getStudentByUsername1(
      @Query('username') username: string,
      @Query('school_id') schoolId: string,
      @Query('class_id') classId: string,
    ) {
      if (!username || !schoolId || !classId) {
        throw new BadRequestException('Missing parameters');
      }

      const schoolIdInt = parseInt(schoolId);
      const classIdInt = parseInt(classId);

      const student = await this.studentsService.findStudentByUsernameClassSchool(
        username,
        classIdInt,
        schoolIdInt,
      );

      if (!student) {
        return {
          status: 'error',
          message: 'Student not found',
        };
      }

      return {
        status: 'success',
        student: {
          name: student.name,
          gender: student.gender,
          email: student.email,
          mobile: student.mobile,
          community:student.community,
          father_name:student.father_name,
          DOB:student.DOB,
          route:student.route,
        },
      };
    }
   // attendance.controller.ts
@Get('attendance/consecutive-absents')
getConsecutiveAbsents(
  @Query('school_id') school_id: number,
  @Query('class_id') class_id: number,
  @Query('limit') limit: number
) {
  return this.studentsService.getUsersWithLongestConsecutiveAbsentDays({ school_id, class_id, limit });
}

@Get('low-percentage')
  async getLowAttendanceStudents(
    @Query('school_id') school_id: number,
    @Query('class_id') class_id: number,
    @Query('thresholdPercent') thresholdPercent?: number,
  ) {
    if (!thresholdPercent) {
      throw new Error('thresholdPercent query parameter is required');
    }
     return this.studentsService.getStudentsWithLowAttendance({school_id, class_id, thresholdPercent });
  }

  @Get('count_usage')
  async countUsage(
    @Query('school_id') school_id: string,
  ) {
    
     return this.studentsService.countUsage(school_id);
  }
}

