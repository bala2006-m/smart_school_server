import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcrypt';
import { ChangeStaffPasswordDto } from './dto/change-password.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.staff.update({
      where: {  username_school_id: { username, school_id: Number(school_id) } },
      data: updateData,
    });
  }

  /** ---------------- GET PROFILE ---------------- */
  async getProfileByUsername(username: string, school_id: number) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }

    return this.prisma.staff.findUnique({
      where: {  username_school_id: { username, school_id: Number(school_id) } },
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
        faculty:true,
      },
    });
  }

  /** ---------------- FIND STAFF ---------------- */
  async findByUsername(username: string, school_id: number) {
    try {
      return await this.prisma.staff.findUnique({
        where: {  username_school_id: { username, school_id: Number(school_id) }},
        select: {
          school_id: true,
          name: true,
          designation: true,
          gender: true,
          mobile: true,
          class_ids: true,
          photo: true,
          email: true,
          faculty:true,
        },
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
async findByMobile(mobile: string, school_id: number) {
  try {
    const normalizedMobile = `+91${mobile}`;

    return await this.prisma.staff.findUnique({
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


  /** ---------------- REGISTER STAFF ---------------- */
  async register(dto: RegisterStaffDto) {
    const exists = await this.prisma.staff.findUnique({
      where: {  username_school_id: { username:dto.username, school_id: Number(dto.school_id) }},
    });

    if (exists) {
      return { status: 'error', message: 'Username already exists' };
    }

    // hash prepared but since schema has no password column, we skip saving
    await bcrypt.hash(dto.password, 10);

    const staff = await this.prisma.staff.create({
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
    const staffList = await this.prisma.staff.findMany({
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
        faculty:true,
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
    const staffList = await this.prisma.staff.findMany({
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
        faculty:true,
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
    const staff = await this.prisma.staff.findUnique({ where: {  username_school_id: { username, school_id: Number(school_id) } } });

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

    return this.prisma.staff.update({
      where: {  username_school_id: { username, school_id: Number(school_id) }},
      data: updateData,
    });
  }

  /** ---------------- DELETE STAFF ---------------- */
  async deleteStaff(username: string, school_id: number) {
    const exists = await this.prisma.staff.findUnique({ where: {  username_school_id: { username, school_id: Number(school_id) } } });

    if (!exists) {
      return { status: 'error', message: 'Staff not found' };
    }

    await this.prisma.staff.delete({ where: {  username_school_id: { username, school_id: Number(school_id) } } });

    return { status: 'success', message: `Staff '${username}' deleted.` };
  }

  /** ---------------- COUNT STAFF ---------------- */
  async countStaffBySchoolId(schoolId: number) {
    const count = await this.prisma.staff.count({
      where: { school_id: schoolId },
    });

    return {
      status: 'success',
      count,
    };
  }
  
async countUsage(schoolId: string): Promise<number> {
  const grouped = await this.prisma.staffAttendance.groupBy({
    by: ['date'],
    where: {
      school_id: Number(schoolId),
    },
  });

  return grouped.length;
}

}
