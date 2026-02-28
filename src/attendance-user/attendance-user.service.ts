
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class AttendanceUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async deleteUser(
    username: string,
    role: string,
    school_id: number
  ) {
    const allowedRoles = ['staff', 'student', 'admin', 'administrator'];

    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const client = this.dbConfig.getDatabaseClient(this.request);

    // Optional: delete from role-specific table first
    if (role === 'staff') {
      await (client as any).staff.deleteMany({
        where: { username },
      });
    } else if (role === 'student') {
      await (client as any).student.deleteMany({
        where: { username },
      });
    } else if (role === 'admin' || role === 'administrator') {
      await (client as any).admin.deleteMany({
        where: { username },
      });
    }

    const deleted = await (client as any).attendance_user.deleteMany({
      where: {
        username,
        role,
        school_id,
      },
    });

    return deleted;
  }
  async getUsersByRole(role: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).attendance_user.findMany({
      where: {
        role: role.toLowerCase(),
        school_id: Number(school_id)
      },
      select: {
        id: true,
        username: true,
        school_id: true,
        password: true,
      },
      orderBy: { username: 'asc' },
    });
  }
  async getUsers(role: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).attendance_user.findMany({
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
