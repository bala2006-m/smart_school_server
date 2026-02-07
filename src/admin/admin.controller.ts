import { Controller, Get, Param, Patch, Body,Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Prisma } from '@prisma/client';


@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}
@Get('fetch_admin_and_school_data')
  async fetchAdminAndSchoolData(@Query('username') username: string,@Query('school_id') school_id:string) {
    try {
      const data = await this.adminService.fetchAdminAndSchoolData(username,Number(school_id));
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
  @Get('fetch_admin')
  async fetchAdminData(@Query('username') username?: string,@Query('school_id') school_id?:number) {
    try {
      const data = await this.adminService.getAdmin(username,school_id);
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
  @Get('fetch_all_admin')
  async fetchAllAdminData(@Query('school_id') school_id?:number) {
    try {
      const data = await this.adminService.getAllAdmin(school_id);
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
  @Patch(':username/:school_id')
async updateAdmin(
  @Param('username') username: string,
  @Param('school_id') school_id: number,
  @Body() dto: UpdateAdminDto,
) {
  return this.adminService.updateAdmin(username, school_id, dto);
}


 @Get('fetch_access')
  async fetchAccess(@Query('username') username: string,@Query('school_id') school_id:number) {
    try {
      const data = await this.adminService.getAccess(username,school_id);
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
  return this.adminService.updateAccess(username, school_id, access);
}

}
