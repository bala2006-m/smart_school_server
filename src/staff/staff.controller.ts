import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Query,
  Patch
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
// import { ChangeStaffPasswordDto } from './dto/change-password.dto';
import { Param } from '@nestjs/common';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
// import { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}
  @Put('update/:username/:school_id')
  async updateProfile(
    @Param('username') username: string,
    @Param('school_id') school_id:number,
    @Body() updateData: UpdateStaffDto,
  ) {
    const staff = await this.staffService.findByUsername(username,school_id);
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    const updated = await this.staffService.updateProfile(username, updateData,school_id);
    return { status: 'success', data: updated };
  }

  @Get('fetch-staffs')
  async getProfileByUsername1(@Query('username') username: string, @Query('school_id') school_id:number,) {
    if (!username) {
      return {
        status: 'error',
        message: 'Missing or empty username parameter.',
      };
    }

    try {
      const staff = await this.staffService.getProfileByUsername(username,school_id);

      if (staff) {
        return {
          status: 'success',
          staff: {
            id: staff.id,
            username: staff.username,
            email: staff.email,
            school_id: staff.school_id,
            name: staff.name,
            designation: staff.designation,
            gender: staff.gender,
            mobile: staff.mobile,
            class_ids:staff.class_ids,
            photo:staff.photo,
            faculty:staff.faculty,
          },
        };
      } else {
        return {
          status: 'success',
          staff: null,
          message: `No staff found for username: ${username}`,
        };
      }
    } catch (error) {
      console.error('Controller error:', error); // ✅ log controller-level issues too
      return {
        status: 'error',
        message: 'Database query failed.',
      };
    }
  }

  @Get('fetch-by-username')
  async getByUsername(@Query('username') username: string, @Query('school_id') school_id:number,) {
    if (!username) {
      return {
        status: 'error',
        message: 'Missing or empty username parameter.',
      };
    }

    try {
      const staff = await this.staffService.findByUsername(username,school_id);

    if (staff) {
      return {
        status: 'success',
        staff: {
          school_id: staff.school_id,
          name: staff.name,
          designation: staff.designation,
          gender: staff.gender,
          mobile: staff.mobile,
          class_ids:staff.class_ids,
          photo:staff.photo,
          email:staff.email,
           faculty:staff.faculty,
           
        },
      };
    } else {
      return {
        status: 'success',
        staff: null,
        message: `No staff found for username: ${username}`,
      };
    }
  } catch (error) {
    console.error('Controller error:', error); // ✅ log controller-level issues too
    return {
      status: 'error',
      message: 'Database query failed.',
    };
  }
}

  @Get('fetch-by-mobile')
  async getByMobile(@Query('mobile') mobile: string,@Query('school_id') school_id: number) {
    if (!mobile) {
      return {
        status: 'error',
        message: 'Missing or empty mobile parameter.',
      };
    }

    try {
      const staff = await this.staffService.findByMobile(mobile,school_id);

      if (staff) {
        return {
          status: 'success',
          staff: {
            username: staff.username,
          },
        };
      } else {
        return {
          status: 'success',
          staff: null,
          message: `No staff found for mobile: ${mobile}`,
        };
      }
    } catch (error) {
      console.error('Controller error:', error);
      return {
        status: 'error',
        message: 'Database query failed.',
      };
    }
  }

  @Post('register')
  async register(@Body() dto: RegisterStaffDto) {
    return this.staffService.register(dto);
  }
  @Get('all-by-school')
  async getAllBySchoolId(@Query('school_id') schoolId: string) {
    if (!schoolId) {
      return { status: 'error', message: 'Missing school_id' };
    }
    const id = parseInt(schoolId);
    return this.staffService.getAllBySchool(id);
  }
   @Get('all-by-school_id')
  async getAllBySchool(@Query('school_id') schoolId: string) {
    if (!schoolId) {
      return { status: 'error', message: 'Missing school_id' };
    }
    const id = parseInt(schoolId);
    return this.staffService.getAllBySchoolId(id);
  }
  @Put('update')
  async updateStaff(
    @Query('username') username: string,
     @Query('school_id') school_id:number,
    @Body() dto: UpdateStaffDto,
  ) {
    if (!username) {
      return { status: 'error', message: 'Missing username' };
    }
    return this.staffService.updateStaff(username, dto,school_id);
  }
   @Delete('delete')
    async deleteStaff(@Query('username') username: string, @Query('school_id') school_id:number,) {
      if (!username) {
        return { status: 'error', message: 'Missing username' };
      }
      return this.staffService.deleteStaff(username,school_id);
    }
// @Put('change-password')
//   async changePassword(@Body() dto: ChangeStaffPasswordDto) {
//     return this.staffService.changePassword(dto);
//   }
@Get('count')
  async countStaff(@Query('school_id') schoolId: string) {
    if (!schoolId) {
      throw new BadRequestException('Missing or empty school_id');
    }

    return this.staffService.countStaffBySchoolId(+schoolId);
  }
@Get('count_usage')
  async countUsage(
    @Query('school_id') school_id: string,
  ) {
    
     return this.staffService.countUsage(school_id);
  }


 @Put('update_class_ids')
async updateStaffClass(
  @Query('username') username: string,
  @Query('school_id') school_id: number,
  @Query('class_ids') classIds: string,
) {
  if (!username) {
    return { status: 'error', message: 'Missing username' };
  }

  let parsedClassIds: any;

  try {
    parsedClassIds = JSON.parse(classIds);
  } catch (error) {
    throw new BadRequestException('Invalid class_ids format. Must be JSON array.');
  }

  return this.staffService.updateStaffClass(
    username,
    parsedClassIds,
    school_id,
  );
}
 @Put('update_class_teacher')
async updateStaffClassTeacher(
  @Query('username') username: string,
  @Query('school_id') school_id: number,
  @Query('class_teacher') classIds: string,
) {
  if (!username) {
    return { status: 'error', message: 'Missing username' };
  }

  let parsedClassIds: any;

  try {
    parsedClassIds = JSON.parse(classIds);
  } catch (error) {
    throw new BadRequestException('Invalid class_teacher format. Must be JSON array.');
  }

  return this.staffService.updateStaffClassTeacher(
    username,
    parsedClassIds,
    school_id,
  );
}

@Get('fetch_access')
  async fetchAccess(@Query('username') username: string,@Query('school_id') school_id:number) {
    try {
      const data = await this.staffService.getAccess(username,school_id);
      return {
        status: 'success',
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

    @Patch('update_access/:username/:school_id')
async updateAcess(
  @Param('username') username: string,
  @Param('school_id') school_id: number,
  @Body() access: Prisma.InputJsonValue,
) {
  return this.staffService.updateAccess(username, school_id, access);
}

}
