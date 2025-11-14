import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDesignationDto } from './dto/register-designation.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import * as nodemailer from 'nodemailer';
import { log } from 'console';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(data: RegisterDto) {
    const { username, password, role, school_id } = data;

    // Check if username exists
    const existingUser = await this.prisma.attendance_user.findUnique({
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
      const newUser = await this.prisma.attendance_user.create({
        data: {
          username,
          password: hashedPassword,
          role,
          school_id,
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
    const {
      username,
      designation,
      school_id,
      mobile,
      table,
      email,
      class_id,
      name,
      gender,faculty,
    } = dto;

    const schoolIdInt = parseInt(school_id);
    const classIdInt = parseInt(class_id);

    // Table-specific logic
    const tableMap = {
      admin: async () => {
        const exists = await this.prisma.admin.findUnique({
          where: {username_school_id: { username, school_id: Number(school_id) }  },
        });
        if (exists)
          throw new ConflictException('Username already exists in admin');
        return this.prisma.admin.create({
          data: {
            username,
            designation,
            school_id: schoolIdInt,
            mobile,
          },
        });
      },
      staff: async () => {
  const exists = await this.prisma.staff.findUnique({
    where: { username_school_id: { username, school_id: Number(school_id) } },
  });

  if (exists) {
    throw new ConflictException('Username already exists in staff');
  }

  return this.prisma.staff.create({
    data: {
      username,
      designation,
      school_id: schoolIdInt,
      mobile,
      ...(email ? { email } : {}),   // only include if provided
      class_ids: [], 
      faculty,                // JSON array
    },
  });
},

      students: async () => {
        const exists = await this.prisma.student.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) }},
        });
        if (exists)
          throw new ConflictException('Username already exists in students');
        return this.prisma.student.create({
          data: {
            username,
            name,
            gender,
            school_id: schoolIdInt,
            mobile,
            class_id: classIdInt,
            email,
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
    const { username, name, gender, email, mobile, class_id, school_id,fatherName,community,route,dob } = dto;

    // Check if username exists
    const exists = await this.prisma.student.findUnique({
      where: {  username_school_id: { username, school_id: Number(school_id) }},
    });

    if (exists) {
      throw new ConflictException('Username already exists');
    }

    try {
      const student = await this.prisma.student.create({
        data: {
          username,
          name,
          gender,
          email,
          mobile,
          class_id: Number(class_id),
          school_id: Number(school_id),
          father_name:fatherName,
          community,
          route:route,
          DOB:new Date(dob)

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
  async registerDesignation1(dto,faculty?:string) {
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
      // console.log(⚠ Empty row detected for table: ${table});
      return { emptyRow: true };
    }

    const schoolIdInt = parseInt(school_id);
    const classIdInt = class_id ? parseInt(class_id) : null;

    const tableMap = {
      admin: async () => {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);

        const existingAdmin = await this.prisma.admin.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) } },
        });
        if (existingAdmin) return { alreadyExisting: { username } };

        const attendanceUser = await this.prisma.attendance_user.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) }},
        });
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!attendanceUser) {
          await this.prisma.attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'admin',
              school_id: schoolIdInt,
            },
          });
        }

        return await this.prisma.admin.create({
          data: {
            username,
            name,
            designation,
            gender,
            school_id: schoolIdInt,
            mobile,
            email,
          },
        });
      },

      staff: async () => {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);

        const existingStaff = await this.prisma.staff.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) }},
        });
        if (existingStaff) return { alreadyExisting: { username } };

        const attendanceUser = await this.prisma.attendance_user.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) }},
        });
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!attendanceUser) {
          await this.prisma.attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'staff',
              school_id: schoolIdInt,
            },
          });
        }
// console.log('Service Faculty:', faculty);
        return await this.prisma.staff.create({
          data: {
            username,
            name,
            gender,
            designation,
            school_id: schoolIdInt,
            mobile,
            faculty: faculty,
            email,
            class_ids:[]
          },
        });
      },

      students: async () => {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolIdInt },
        });
        if (!school)
          throw new BadRequestException(`Invalid school_id: ${schoolIdInt}`);
const classes = await this.prisma.classes.findUnique({
          where: { id: Number(classIdInt),
            school_id:schoolIdInt
           },
        });
        if (!classes)
          throw new BadRequestException(`Invalid class_id: ${classIdInt}`);

        const existingStudent = await this.prisma.student.findUnique({
          where: {  username_school_id: { username, school_id: Number(school_id) }},
        });
        if (existingStudent) return { alreadyExisting: { username } };

        const attendanceUser = await this.prisma.attendance_user.findUnique({
          where: { username_school_id: { username, school_id: Number(school_id) } },
        });
        const hashedPassword = await bcrypt.hash(password, 10);

        if (!attendanceUser) {
          await this.prisma.attendance_user.create({
            data: {
              username,
              password: hashedPassword || '',
              role: 'student',
              school_id: schoolIdInt,
            },
          });
        }

        return await this.prisma.student.create({
          data: {
            username,
            name:name.toUpperCase(),
            gender: gender as any,
            mobile,
            email,
            photo: null,
            school_id: schoolIdInt,
            class_id: Number(classIdInt),
            DOB:new Date(DOB),
            community:community.toUpperCase(),
            father_name:father_name.toUpperCase(),
            route:route.toUpperCase(),
            address:address.toUpperCase(),
            date_of_join:new Date(date_of_join),

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
  async updatePassword(username: string, newPassword: string,school_id:number) {
    // Check if user exists
    const user = await this.prisma.attendance_user.findUnique({ where: { username_school_id: { username, school_id: Number(school_id) } } });
    if (!user) {
      throw new BadRequestException({ status: 'error', message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await this.prisma.attendance_user.update({
      where: {  username_school_id: { username, school_id: Number(school_id) }},
      data: { password: hashedPassword },
    });

    return { status: 'success', message: 'Password updated successfully' };
  }
}