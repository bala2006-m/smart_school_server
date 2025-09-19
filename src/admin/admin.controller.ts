import { Controller, Get, Param, Patch, Body,Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';


@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

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

}
