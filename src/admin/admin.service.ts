import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async fetchAdminAndSchoolData(username: string, schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const [adminData, schoolData] = await Promise.all([
      (client as any).admin.findUnique({
        where: { username_school_id: { username, school_id: schoolId } },
        select: {
          name: true,
          designation: true,
          mobile: true,
          photo: true,
        },
      }),
      (client as any).school.findUnique({
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
    const client = this.dbConfig.getDatabaseClient(this.request);
    if (username && school_id) {
      const admin = await (client as any).admin.findUnique({
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
    const admins = await (client as any).admin.findMany({
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
  async getAccess(username: string, school_id: number) {

    const client = this.dbConfig.getDatabaseClient(this.request);
    const admin = await (client as any).admin.findUnique({
      where: {
        username_school_id: { username, school_id: Number(school_id) },
      },
      select: {
        id: true,
        access: true
      },
    });

    if (!admin) return null;
    const defaultAccess = {
      staff: true,
      student: true,
      manage: true,
      access: true,
      exam: true,
      collectFees: true,
      termFees: true,
      rteFees: true,
      busFees: true,
      account: true,
      services: true,
      bulkUpload: true,
      viewProfiles: true,
      reports: true,

    };
    return {
      status: 'success',
      access: admin.access ?? defaultAccess,
    };


    //   // fetch all admins
    //   const admins = await this.prisma.admin.findMany({
    //     select: {
    //       name: true,
    //       username: true,
    //       designation: true,
    //       mobile: true,
    //       email: true,
    //       photo: true,
    //       school_id: true,
    //       gender: true,
    //     },
    //     orderBy: { name: 'asc' },
    //   });

    //   return admins.map((admin) => ({
    //     ...admin,
    //     photo: admin.photo ? Buffer.from(admin.photo).toString('base64') : null,
    //   }));
  }
  async getCats(username: string, school_id: number) {

    const client = this.dbConfig.getDatabaseClient(this.request);
    const admin = await (client as any).admin.findUnique({
      where: {
        username_school_id: { username, school_id: Number(school_id) },
      },
      select: {
        categories: true,
        buttons: true
      },
    });


    return admin;
  }
  async getAllAdmin(school_id?: number) {

    const client = this.dbConfig.getDatabaseClient(this.request);
    // fetch all admins
    const admins = await (client as any).admin.findMany({
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
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existingAdmin = await (client as any).admin.findUnique({
      where: { username_school_id: { username, school_id: Number(school_id) } },
    });

    if (!existingAdmin) {
      throw new NotFoundException(
        `Admin with username "${username}" and school_id "${school_id}" not found.`,
      );
    }

    // build updateData only with provided fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.toUpperCase();
    if (data.designation !== undefined) updateData.designation = data.designation.toUpperCase();
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.gender !== undefined) updateData.gender = data.gender.toUpperCase();
    if (data.email !== undefined) updateData.email = data.email;
    if (data.photoBase64) updateData.photo = Buffer.from(data.photoBase64, 'base64');

    try {
      await (client as any).admin.update({
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



  async updateAccess(
    username: string,
    school_id: number,
    access: Prisma.InputJsonValue,
  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existingAdmin = await (client as any).admin.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException(
        `Admin with username "${username}" and school_id "${school_id}" not found.`,
      );
    }

    try {
      await (client as any).admin.update({
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
  async updateCats(
    username: string,
    school_id: number,
    all: Prisma.InputJsonValue,

  ) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existingAdmin = await (client as any).admin.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException(
        `Admin with username "${username}" and school_id "${school_id}" not found.`,
      );
    }

    try {
      await (client as any).admin.update({
        where: {
          username_school_id: {
            username,
            school_id: Number(school_id),
          },
        },
        data: {
          categories: all['categories'],

          buttons: all['buttons']
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
