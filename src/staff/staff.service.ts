import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcrypt';
import { ChangeStaffPasswordDto } from './dto/change-password.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { log } from 'console';
import { Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  /** ---------------- UPDATE PROFILE ---------------- */
  async updateProfile(username: string, data: UpdateStaffDto, school_id: number) {
    const { photo, ...restDto } = data;
    //const updateData: any = { ...restDto };
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.toUpperCase();
    if (data.designation !== undefined) updateData.designation = data.designation.toUpperCase();
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.gender !== undefined) updateData.gender = data.gender.toUpperCase();
    if (data.email !== undefined) updateData.email = data.email;
    if (data.photo) updateData.photo = Buffer.from(data.photo, 'base64');
    if (photo) {
      try {
        updateData.photo = Buffer.from(photo, 'base64');
      } catch {
        return { status: 'error', message: 'Invalid photo format' };
      }
    }

    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).staff.update({
      where: { username_school_id: { username, school_id: Number(school_id) } },
      data: updateData,
    });
  }

  /** ---------------- GET PROFILE ---------------- */
  async getProfileByUsername(username: string, school_id: number) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }

    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).staff.findUnique({
      where: { username_school_id: { username, school_id: Number(school_id) } },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        mobile: true,
        gender: true,
        designation: true,
        school_id: true,
        class_ids: true,
        photo: true,
        faculty: true,
      },
    });
  }

  /** ---------------- FIND STAFF ---------------- */
  async findByUsername(username: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    try {
      return await (client as any).staff.findUnique({
        where: { username_school_id: { username, school_id: Number(school_id) } },
        select: {
          school_id: true,
          name: true,
          designation: true,
          gender: true,
          mobile: true,
          class_ids: true,
          photo: true,
          email: true,
          faculty: true,
        },
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  async findByMobile(mobile: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    try {
      const normalizedMobile = `+91${mobile}`;

      return await (client as any).staff.findUnique({
        where: {
          mobile_school_id: {
            mobile: normalizedMobile,
            school_id: school_id,
          },
        },
        select: {
          username: true,
        },
      });
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }


  async register(dto: RegisterStaffDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const exists = await (client as any).staff.findUnique({
      where: { username_school_id: { username: dto.username, school_id: Number(dto.school_id) } },
    });

    if (exists) {
      return { status: 'error', message: 'Username already exists' };
    }

    // hash prepared but since schema has no password column, we skip saving
    await bcrypt.hash(dto.password, 10);

    const staff = await (client as any).staff.create({
      data: {
        username: dto.username,
        designation: dto.designation,
        name: dto.name,
        email: dto.email,
        gender: dto.gender,
        mobile: dto.mobile,
        school_id: dto.school_id,
        class_ids: dto.class_ids,
      },
    });

    return { status: 'success', staff };
  }

  /** ---------------- GET ALL STAFF ---------------- */
  async getAllBySchool(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staffList = await (client as any).staff.findMany({
      where: { school_id },
      select: {
        id: true,
        username: true,
        designation: true,
        name: true,
        email: true,
        gender: true,
        mobile: true,
        class_ids: true,
        photo: true,
        faculty: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      status: 'success',
      count: staffList.length,
      staff: staffList,
    };
  }
  async getAllBySchoolId(school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staffList = await (client as any).staff.findMany({
      where: { school_id },
      select: {
        id: true,
        username: true,
        designation: true,
        name: true,
        email: true,
        gender: true,
        mobile: true,
        class_ids: true,
        faculty: true,
        class_teacher: true
      },
      orderBy: { name: 'asc' },
    });

    return {
      status: 'success',
      count: staffList.length,
      staff: staffList,
    };
  }
  /** ---------------- UPDATE STAFF ---------------- */
  async updateStaff(username: string, dto: UpdateStaffDto, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staff = await (client as any).staff.findUnique({ where: { username_school_id: { username, school_id: Number(school_id) } } });

    if (!staff) {
      return { status: 'error', message: 'Staff not found' };
    }

    const { photo, ...restDto } = dto;
    const updateData: any = { ...restDto };

    if (photo) {
      try {
        updateData.photo = Buffer.from(photo, 'base64');
      } catch {
        return { status: 'error', message: 'Invalid photo format' };
      }
    }

    return (client as any).staff.update({
      where: { username_school_id: { username, school_id: Number(school_id) } },
      data: updateData,
    });
  }
  async updateStaffClass(
    username: string,
    classIds: InputJsonValue,
    school_id: number
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staff = await (client as any).staff.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (!staff) {
      return { status: 'error', message: 'Staff not found' };
    }

    const newClassIds: number[] = Array.isArray(classIds)
      ? (classIds as number[])
      : [];

    const existingClassTeacher: number[] = Array.isArray(staff.class_teacher)
      ? (staff.class_teacher as number[])
      : [];

    // Check if any class_teacher is missing in new class_ids
    const invalidTeachers = existingClassTeacher.filter(
      (id) => !newClassIds.includes(id)
    );

    if (invalidTeachers.length > 0) {
      return {
        status: 'error',
        message: `class assigned as class teacher: ${invalidTeachers.join(', ')}`,
      };
    }

    return (client as any).staff.update({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
      data: {
        class_ids: newClassIds,
      },
    });
  }


  async updateStaffClassTeacher(
    username: string,
    classIds: number[],
    school_id: number
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staff = await (client as any).staff.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (!staff) {
      return { status: 'error', message: 'Staff not found' };
    }

    const existingClassIds: number[] = Array.isArray(staff.class_ids)
      ? (staff.class_ids as number[])
      : [];

    const teacherClassIds: number[] = Array.isArray(classIds)
      ? classIds
      : [];

    const updatedClassIds = Array.from(
      new Set([...existingClassIds, ...teacherClassIds])
    );

    return (client as any).staff.update({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
      data: {
        class_teacher: teacherClassIds,
        class_ids: updatedClassIds,
      },
    });
  }


  /** ---------------- DELETE STAFF ---------------- */
  async deleteStaff(username: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const exists = await (client as any).staff.findUnique({ where: { username_school_id: { username, school_id: Number(school_id) } } });

    if (!exists) {
      return { status: 'error', message: 'Staff not found' };
    }

    await (client as any).staff.delete({ where: { username_school_id: { username, school_id: Number(school_id) } } });

    return { status: 'success', message: `Staff '${username}' deleted.` };
  }

  /** ---------------- COUNT STAFF ---------------- */
  async countStaffBySchoolId(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const count = await (client as any).staff.count({
      where: { school_id: schoolId },
    });

    return {
      status: 'success',
      count,
    };
  }

  async countUsage(schoolId: string): Promise<number> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const grouped = await (client as any).staffAttendance.groupBy({
      by: ['date'],
      where: {
        school_id: Number(schoolId),
      },
    });

    return grouped.length;
  }

  async getAccess(username: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const staff = await (client as any).staff.findUnique({
      where: {
        username_school_id: { username, school_id: Number(school_id) },
      },
      select: {
        id: true,
        access: true
      },
    });

    if (!staff) return null;
    const defaultAccess = {
      student: true,
      myself: true,
      manage: true,
      services: true,

    };
    return {
      status: 'success',
      access: staff.access ?? defaultAccess,
    };

  }

  async updateAccess(
    username: string,
    school_id: number,
    access: Prisma.InputJsonValue,
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existingStaff = await (client as any).staff.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (!existingStaff) {
      throw new NotFoundException(
        `Staff with username "${username}" and school_id "${school_id}" not found.`,
      );
    }

    try {
      await (client as any).staff.update({
        where: {
          username_school_id: {
            username,
            school_id: Number(school_id),
          },
        },
        data: {
          access: access, // must be JSON object
        },
      });

      return { message: 'Access updated successfully' };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Mobile or username already exists within this school.',
        );
      }
      throw error;
    }
  }

}
