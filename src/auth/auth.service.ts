import {
  Inject,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDesignationDto } from './dto/register-designation.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import * as nodemailer from 'nodemailer';
import { log } from 'console';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async register(data: RegisterDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const { username, password, role, school_id } = data;

    // Check if username exists
    const existingUser = await (client as any).attendance_user.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: Number(school_id),
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await (client as any).attendance_user.create({
        data: {
          username,
          password: hashedPassword,
          role,
          school: { connect: { id: Number(school_id) } },
        },
      });

      return {
        status: 'success',
        message: 'Registration successful',
        username: newUser.username,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Registration failed: ' + error.message,
      );
    }
  }

  async registerDesignation(dto: RegisterDesignationDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const {
      username,
      designation,
      school_id,
      mobile,
      table,
      email,
      class_id,
      name,
      gender,
      faculty,
    } = dto;

    const schoolIdInt = parseInt(school_id);
    const classIdInt = parseInt(class_id);

    // Table-specific logic
    const tableMap = {
      admin: async () => {
        const exists = await (client as any).admin.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        if (exists)
          throw new ConflictException('Username already exists in admin');
        return (client as any).admin.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            designation: designation || 'admin',
            school: { connect: { id: schoolIdInt } },
            mobile: mobile || '',
          },
        });
      },
      staff: async () => {
        const exists = await (client as any).staff.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });

        if (exists) {
          throw new ConflictException('Username already exists in staff');
        }

        return (client as any).staff.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            designation: designation || 'staff',
            school: { connect: { id: schoolIdInt } },
            mobile: mobile || '',
            ...(email ? { email } : {}),   // only include if provided
            class_ids: [],
            faculty: faculty || 'null',                // JSON array
          },
        });
      },
      students: async () => {
        const exists = await (client as any).student.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        if (exists)
          throw new ConflictException('Username already exists in students');
        return (client as any).student.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            name: name || '',
            gender: gender as any,
            school: { connect: { id: schoolIdInt } },
            class: { connect: { id: classIdInt } },
            email: email || 'null',
          },
        });
      },
    };

    const insertFn = tableMap[table];
    if (!insertFn) {
      throw new BadRequestException('Invalid table name');
    }

    const result = await insertFn();

    return {
      status: 'success',
      message: 'Designation registration successful',
      table,
      username,
    };
  }

  async registerStudent(dto: RegisterStudentDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const { username, name, gender, email, mobile, class_id, school_id, fatherName, community, route, dob } = dto;

    // Check if username exists
    const exists = await (client as any).student.findUnique({
      where: { username_school_id: { username, school_id: Number(school_id) } },
    });

    if (exists) {
      throw new ConflictException('Username already exists');
    }

    try {
      const student = await (client as any).student.create({
        data: {
          user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
          name,
          gender,
          email,
          mobile,
          school: { connect: { id: Number(school_id) } },
          class: { connect: { id: Number(class_id) } },
          father_name: fatherName,
          community,
          route: route,
          DOB: new Date(dob)

        },
      });

      return {
        status: 'success',
        message: 'Registration successful',
        username: student.username,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Registration failed: ' + error.message,
      );
    }
  }

  async registerDesignation1(dto, faculty?: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const {
      username,
      name,
      gender,
      role,
      designation,
      school_id,
      mobile,
      email,
      class_id,
      password,
      table,
      DOB,
      community,
      father_name,
      route,
      address,
      date_of_join
    } = dto;

    // ✅ Detect fully empty rows
    if (
      (!username || username.trim() === '') &&
      (!name || name.trim() === '') &&
      (!gender || gender.toString().trim() === '') &&
      (!school_id || school_id.toString().trim() === '') &&
      (!mobile || mobile.trim() === '') &&
      (!email || email.trim() === '') &&
      (!class_id || class_id.toString().trim() === '') &&
      (!password || password.trim() === '')
    ) {
      return { emptyRow: true };
    }

    const schoolIdInt = parseInt(school_id);
    const classIdInt = class_id ? parseInt(class_id) : null;

    const tableMap = {
      admin: async () => {
        const school = await (client as any).school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);

        const existingAdmin = await (client as any).admin.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        if (existingAdmin) return { alreadyExisting: { username } };

        const attendanceUser = await (client as any).attendance_user.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!attendanceUser) {
          await (client as any).attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'admin',
              school: { connect: { id: schoolIdInt } },
            },
          });
        }

        return await (client as any).admin.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            name: name || '',
            designation: designation || 'admin',
            gender: gender || 'null',
            school: { connect: { id: schoolIdInt } },
            mobile: mobile || '',
            email: email || 'example@gmail.com',
          },
        });
      },

      staff: async () => {
        const school = await (client as any).school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);

        const existingStaff = await (client as any).staff.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        if (existingStaff) return { alreadyExisting: { username } };

        const attendanceUser = await (client as any).attendance_user.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!attendanceUser) {
          await (client as any).attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'staff',
              school: { connect: { id: schoolIdInt } },
            },
          });
        }

        return await (client as any).staff.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            name: name || '',
            gender: (gender as any) || null,
            designation: designation || 'staff',
            school: { connect: { id: schoolIdInt } },
            mobile: mobile || '',
            faculty: faculty || 'null',
            email: email || 'null',
            class_ids: []
          },
        });
      },

      students: async () => {
        const school = await (client as any).school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);
        const classes = await (client as any).classes.findUnique({
          where: {
            id: Number(classIdInt),
            school_id: schoolIdInt
          },
        });
        if (!classes)
          throw new BadRequestException(`Invalid class_id: ${classIdInt}`);

        const existingStudent = await (client as any).student.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        if (existingStudent) return { alreadyExisting: { username } };

        const attendanceUser = await (client as any).attendance_user.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        const hashedPassword = await bcrypt.hash(password, 10);

        if (!attendanceUser) {
          await (client as any).attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'student',
              school: { connect: { id: schoolIdInt } },
            },
          });
        }

        return await (client as any).student.create({
          data: {
            user: { connect: { username_school_id: { username, school_id: Number(school_id) } } },
            name: name.toUpperCase(),
            gender: gender as any,
            mobile,
            email,
            photo: null,
            school: { connect: { id: schoolIdInt } },
            class: { connect: { id: Number(classIdInt) } },
            DOB: new Date(DOB),
            community: community.toUpperCase(),
            father_name: father_name.toUpperCase(),
            route,
            address: address.toUpperCase(),
            date_of_join: new Date(date_of_join),

          },
        });
      },
    };

    const insertFn = tableMap[table];
    if (!insertFn) throw new BadRequestException('Invalid table name');

    return await insertFn();
  }

  async sendOtp(email: string, otp: string) {
    // ✅ Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'Noreply.ramchintech@gmail.com', // Your Gmail
        pass: 'zkvb rmyu yqtm ipgv',       // Use Gmail App Password
      },
    });

    // ✅ Email options
    const mailOptions = {
      from: 'Noreply.ramchintech@gmail.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { status: 'success', message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new BadRequestException({ status: 'error', message: 'Failed to send OTP' });
    }
  }

  // ✅ Update Password Logic
  async updatePassword(username: string, newPassword: string, school_id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    // Check if user exists
    const user = await (client as any).attendance_user.findUnique({ where: { username_school_id: { username, school_id: Number(school_id) } } });
    if (!user) {
      throw new BadRequestException({ status: 'error', message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await (client as any).attendance_user.update({
      where: { username_school_id: { username, school_id: Number(school_id) } },
      data: { password: hashedPassword },
    });

    return { status: 'success', message: 'Password updated successfully' };
  }

  async login(body: any) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const { username, password, school_id } = body;

    if (!username || !password || !school_id) {
      throw new BadRequestException('Missing username, password, or school_id');
    }

    const schoolIdNum = Number(school_id);

    // Try to find the user in attendance_user table first (centralized table)
    const user = await (client as any).attendance_user.findUnique({
      where: {
        username_school_id: {
          username,
          school_id: schoolIdNum,
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid username or school ID');
    }

    // Verify password on server
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    return {
      status: 'success',
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        school_id: user.school_id,
        password: user.password, // Frontend expects hashed password for local compatibility
      },
    };
  }
}