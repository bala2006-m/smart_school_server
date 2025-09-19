
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AttendanceUserService {
  constructor(private readonly prisma: PrismaService) {}
async deleteUser(
  username: string,
  role: string,
  school_id: number
)  {
  const allowedRoles = ['staff', 'student', 'admin', 'administrator'];

  if (!allowedRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Optional: delete from role-specific table first
  if (role === 'staff') {
    await this.prisma.staff.deleteMany({
      where: { username },
    });
  } else if (role === 'student') {
    await this.prisma.student.deleteMany({
      where: { username },
    });
  } else if (role === 'admin' || role === 'administrator') {
    await this.prisma.admin.deleteMany({
      where: { username },
    });
  }

  const deleted = await this.prisma.attendance_user.deleteMany({
    where: {
      username,
      role,
      school_id,
    },
  });

  return deleted;
}
  async getUsersByRole(role: string,school_id:number) {
    return this.prisma.attendance_user.findMany({
      where: {
        role: role.toLowerCase(), 
        school_id:Number(school_id)
      },
      select: {
        id: true,
        username: true,
        school_id: true,
        password:true,
      },
       orderBy: { username: 'asc' },
    });
  }
  async getUsers(role: string) {
    return this.prisma.attendance_user.findMany({
      where: {
        role: role.toLowerCase(), 
      },
      select: {
        id: true,
        username: true,
        school_id: true,
      },
       orderBy: { username: 'asc' },
    });
  }
}
