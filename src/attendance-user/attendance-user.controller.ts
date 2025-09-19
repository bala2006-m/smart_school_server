
import { BadRequestException, Body, Controller, Get,Post, Query } from '@nestjs/common';
import { AttendanceUserService } from './attendance-user.service';

@Controller('attendance-users')
export class AttendanceUserController {
  constructor(private readonly attendanceUserService: AttendanceUserService) {}
 @Post('delete')
  async deleteUser(
    @Body() body: { username: string; role: string; school_id: number }
  ) {
    const { username, role, school_id } = body;

    if (!username || !role || school_id === undefined) {
      throw new BadRequestException('Missing required fields');
    }

    const allowedRoles = ['staff', 'student', 'admin', 'administrator'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    const result = await this.attendanceUserService.deleteUser(username, role, school_id);

    if (result.count === 0) {
      return { message: 'User not found or already deleted' };
    }

    return { message: 'User deleted successfully' };
  }

  @Get()
  async getUsersByRole(@Query('role') role: string,@Query('school_id') school_id:number
  ) {
    return this.attendanceUserService.getUsersByRole(role,school_id);
  }
   @Get('attendance-users-all')
  async getUser(@Query('role') role: string
  ) {
    return this.attendanceUserService.getUsers(role);
  }
}
