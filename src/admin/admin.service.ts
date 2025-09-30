import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
async fetchAdminAndSchoolData(username: string, schoolId: number) {
  const [adminData, schoolData] = await Promise.all([
    this.prisma.admin.findUnique({
      where: { username_school_id: { username, school_id: schoolId } },
      select: {
        name: true,
        designation: true,
        mobile: true,
        photo: true,
      },
    }),
    this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        address: true,
        photo: true,
      },
    }),
  ]);

  return {
    adminData: adminData
      ? { ...adminData, photo: adminData.photo ? Buffer.from(adminData.photo).toString('base64') : null }
      : null,
    schoolData: schoolData
      ? { ...schoolData, photo: schoolData.photo ? Buffer.from(schoolData.photo).toString('base64') : null }
      : null,
  };
}

  /**
   * Get one admin (by username + school_id) or all admins
   */
  async getAdmin(username?: string, school_id?: number) {
    if (username && school_id) {
      const admin = await this.prisma.admin.findUnique({
        where: {
          username_school_id: { username, school_id: Number(school_id) },
        },
  
        select: {
          name: true,
          username: true,
          designation: true,
          mobile: true,
          email: true,
          photo: true,
          school_id: true,
          gender: true,
        },
      });

      if (!admin) return null;

      return {
        ...admin,
        photo: admin.photo ? Buffer.from(admin.photo).toString('base64') : null,
      };
    }

    // fetch all admins
    const admins = await this.prisma.admin.findMany({
      select: {
        name: true,
        username: true,
        designation: true,
        mobile: true,
        email: true,
        photo: true,
        school_id: true,
        gender: true,
      },
      orderBy: { name: 'asc' },
    });

    return admins.map((admin) => ({
      ...admin,
      photo: admin.photo ? Buffer.from(admin.photo).toString('base64') : null,
    }));
  }


async getAllAdmin( school_id?: number) {
    

    // fetch all admins
    const admins = await this.prisma.admin.findMany({
       where: {
          school_id: Number(school_id) 
        },
      select: {
        name: true,
        username: true,
        designation: true,
        mobile: true,
        email: true,
        school_id: true,
        gender: true,
      },
      orderBy: { name: 'asc' },
    });

    return admins;
  }

  /**
   * Update an admin’s profile
   */
  async updateAdmin(username: string, school_id: number, data: UpdateAdminDto) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { username_school_id: { username, school_id: Number(school_id) } },
    });

    if (!existingAdmin) {
      throw new NotFoundException(
        `Admin with username "${username}" and school_id "${school_id}" not found.`,
      );
    }

    // build updateData only with provided fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.toUpperCase;
    if (data.designation !== undefined) updateData.designation = data.designation.toUpperCase;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.gender !== undefined) updateData.gender = data.gender.toUpperCase;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.photoBase64) updateData.photo = Buffer.from(data.photoBase64, 'base64');

    try {
      await this.prisma.admin.update({
        where: { username_school_id: { username, school_id: Number(school_id) } },
        data: updateData,
      });
      return { message: 'Profile updated successfully' };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Prisma unique constraint error
        throw new BadRequestException(
          'Mobile or username already exists within this school.',
        );
      }
      throw error;
    }
  }
}
