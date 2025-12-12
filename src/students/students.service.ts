import { PrismaService } from '../common/prisma.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { not } from 'rxjs/internal/util/not';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) { }
  async getStudentsWithFlatClassData(schoolId?: string) {
    try {
      const whereClause = schoolId ? { school_id: Number(schoolId) } : {};

      // Use include only, no select at top-level
      const students = await this.prisma.student.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
          class: {
            select: {
              class: true,
              section: true,
            },
          },
        },
      });

      // Map to flatten the response
      const flatStudents = students.map(student => ({
        username: student.username,
        name: student.name,
        gender: student.gender,
        email: student.email,
        mobile: student.mobile,
        class_id: student.class_id,
        community: student.community === "null" ? null : student.community,
        father_name: student.father_name === "null" ? null : student.father_name,
        DOB: student.DOB,
        route: student.route === "null" ? null : student.route,
        class: student.class?.class ?? null,
        section: student.class?.section ?? null,
      }));

      return { status: 'success', students: flatStudents };
    } catch (error) {
      return { status: 'error', message: 'Query failed', details: error.message };
    }
  }

  async fetchUniqueRouts(schoolId: number) {
    try {


      // Use include only, no select at top-level
      const students = await this.prisma.student.findMany({
        where: {
          school_id: Number(schoolId)
        },
        select: {
          route: true
        },
        distinct: ['route'],
        

      });

      return { status: 'success', routs: students };
    } catch (error) {
      return { status: 'error', message: 'Query failed', details: error.message };
    }
  }
  async fetchStudentsRouts(schoolId: number, classId: number) {
    try {


      // Use include only, no select at top-level
      const students = await this.prisma.student.findMany({
        where: {
          school_id: Number(schoolId),
          class_id: Number(classId),
          route: {
            not: 'null',
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
          route: true, gender: true, mobile: true, class_id: true, school_id: true, father_name: true,
          class:true,
          school:true,

        },
        orderBy: {
          username: 'asc',
        },

      });

      return { status: 'success', routs: students };
    } catch (error) {
      return { status: 'error', message: 'Query failed', details: error.message };
    }
  }

  async fetchStudentsRoutsSchool(schoolId: number) {
    try {


      // Use include only, no select at top-level
      const students = await this.prisma.student.findMany({
        where: {
          school_id: Number(schoolId),
          route: {
            not: 'null',
          },
        },
        select: {
          id: true,
          username: true,
          name: true,
          route: true, gender: true, mobile: true, class_id: true, school_id: true, father_name: true,

        },
        orderBy: [
        { class_id: 'asc' },
        { username: 'asc' },
      ],

      });

      return { status: 'success', routs: students };
    } catch (error) {
      return { status: 'error', message: 'Query failed', details: error.message };
    }
  }


  async fetchRteStudentsSchool(schoolId: number) {
    try {


      // Use include only, no select at top-level
      const students = await this.prisma.student.findMany({
        where: {
          school_id: Number(schoolId),
          isRTE:true,
        },
        select: {
          username: true,
          name: true,
          gender: true, mobile: true, 
          class:{
            select:{
              class:true,
              section:true
            }
          }


        },
        orderBy: [
        { class_id: 'asc' },
          { gender: 'asc' },
        { username: 'asc' },
      

      ],
      

      });

      return { status: 'success', totalStudents:students.length,students };
    } catch (error) {
      return { status: 'error', message: 'Query failed', details: error.message };
    }
  }


  async fetchBusStudentsSchool(schoolId: number) {
  try {
    const students = await this.prisma.student.findMany({
      where: {
        school_id: Number(schoolId),
        route: { not: 'null' }
      },
      select: {
        username: true,
        name: true,
        gender: true,
        mobile: true,
        route:true,
        class: {
          select: {
            class: true,
            section: true
          }
        }
      },
      orderBy: [
        { class_id: 'asc' },
        { gender: 'asc' },
        { username: 'asc' }
      ]
    });

    return {
      status: 'success',
      totalStudents: students.length,
      students
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Query failed',
      details: error.message
    };
  }
}

  async getCombinedStudentReport(
    schoolId: string,
    fromDateInput: string,
    toDateInput: string,
  ) {
    try {
      const fromDate = new Date(fromDateInput);
      const toDate = new Date(toDateInput);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
        return { status: 'error', message: 'Invalid date range' };
      }

      // 1. Fetch all students for the school
      const students = await this.prisma.student.findMany({
        where: { school_id: Number(schoolId) },
        orderBy: { name: 'asc' },
        select: {
          username: true,
          name: true,
          gender: true,
          class_id: true,
        },
      });

      // 2. Fetch classes once for all class_ids
      const classIds = Array.from(new Set(students.map(s => s.class_id)));
      const classes = await this.prisma.classes.findMany({
        where: {
          id: { in: classIds },
          school_id: Number(schoolId),
        },
        select: { id: true, class: true, section: true },
      });
      const classMap = new Map(classes.map(c => [c.id, c]));

      // 3. Batch fetch attendance for all students within date range
      // Use usernames array for filtering
      const usernames = students.map(s => s.username);

      const attendanceRecords = await this.prisma.studentAttendance.findMany({
        where: {
          username: { in: usernames },
          date: { gte: fromDate, lte: toDate },
          school_id: Number(schoolId),
        },
        select: {
          username: true,
          date: true,
          fn_status: true,
          an_status: true,
          class_id: true,
        },
        orderBy: { date: 'asc' },
      });

      // Organize attendance by username
      const attendanceMap = new Map<string, typeof attendanceRecords>();
      for (const record of attendanceRecords) {
        if (!attendanceMap.has(record.username)) {
          attendanceMap.set(record.username, []);
        }
        attendanceMap.get(record.username)!.push(record);
      }

      // 4. Build detailed student report combining class and attendance info
      const detailedStudents = students.map(student => {
        const classInfo = classMap.get(student.class_id) || { class: '', section: '' };
        const attendance = attendanceMap.get(student.username) || [];

        // Use improved attendance status codes: 'P' and 'A'
        // Prepare arrays for present/absent half-day dates as ISO strings
        const fnPresentDates: string[] = [];
        const anPresentDates: string[] = [];
        const fnAbsentDates: string[] = [];
        const anAbsentDates: string[] = [];

        for (const att of attendance) {
          const dateStr = att.date.toISOString().split('T')[0];

          if (att.fn_status === 'P') fnPresentDates.push(dateStr);
          if (att.fn_status === 'A') fnAbsentDates.push(dateStr);
          if (att.an_status === 'P') anPresentDates.push(dateStr);
          if (att.an_status === 'A') anAbsentDates.push(dateStr);
        }

        const totalMarking = attendance.length; // two sessions per attendance record
        const totalPresent = fnPresentDates.length + anPresentDates.length;
        const totalPercentage = totalMarking > 0
          ? parseFloat(((totalPresent / totalMarking) * 100).toFixed(2))
          : 0;

        return {
          ...student,
          class: classInfo.class,
          section: classInfo.section,
          fnPresentDates,
          anPresentDates,
          fnAbsentDates,
          anAbsentDates,
          TotalMarking: totalMarking,
          totalPercentage: `${totalPercentage} %`,
        };
      });

      return {
        status: 'success',
        students: detailedStudents,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to fetch combined student report ${error.message}`,
        details: error.message,
      };
    }
  }


  async getSchoolAndClassByUsername(username: string, school_id: number) {
    return this.prisma.student.findUnique({
      where: { username_school_id: { username: username, school_id: Number(school_id) } },
      select: {
        school_id: true,
        class_id: true,
      },
    });
  }
  async findByUsername(username: string, school_id: number) {
    try {
      const student = await this.prisma.student.findUnique({
        where: {
          username_school_id: {
            username,
            school_id: Number(school_id),
          },
        },
        select: {
          name: true,
          gender: true,
          email: true,
          mobile: true,
          photo: true,
          class_id: true,
          school_id: true,
          community: true,
          father_name: true,
          DOB: true,
          route: true,
          address:true,
          date_of_join:true,
          class: {
            select: {
              id: true,
              class: true,
              section: true,
            },
          },
        },
      });

      if (!student) {
        return {
          status: 'success',
          student: null,
          message: `No student found for username: ${username}`,
        };
      }

      return { status: 'success', student };
    } catch (error) {
      console.error('Error in findByUsername:', error);
      throw error;
    }
  }


  async registerStudent(dto: RegisterStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { username_school_id: { username: dto.username, school_id: Number(dto.school_id) } },
    });

    if (existing) {
      return { status: 'error', message: 'Username already exists' };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.student.create({
      data: {
        username: dto.username,
        name: dto.name,
        email: dto.email,
        gender: dto.gender,
        mobile: dto.mobile,
        class_id: Number(dto.class_id),
        school_id: Number(dto.school_id),
      },
    });

    return { status: 'success', student };
  }
  async deleteStudent(username: string, school_id: number) {
    const exists = await this.prisma.student.findUnique({
      where: { username_school_id: { username: username, school_id: Number(school_id) } },
    });

    if (!exists) {
      return { status: 'error', message: 'Student not found' };
    }

    await this.prisma.student.delete({ where: { username_school_id: { username: username, school_id: Number(school_id) } } });

    return { status: 'success', message: `Student '${username}' deleted.` };
  }
  async changeStudentPassword(dto: ChangePasswordDto, school_id: number) {
    const { username, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.attendance_user.findUnique({
      where: { username_school_id: { username: username, school_id: Number(school_id) } },
    });

    if (!user || user.role !== 'student') {
      throw new BadRequestException('Student not found or invalid role');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.attendance_user.update({
      where: { username_school_id: { username: username, school_id: Number(school_id) } },
      data: { password: hashedPassword },
    });

    return { status: 'success', message: 'Password updated successfully' };
  }

  async getAllByClass(class_id: string) {
    const students = await this.prisma.student.findMany({
      where: { class_id: Number(class_id) },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        mobile: true,
        gender: true,
        community: true,
        father_name: true,
        DOB: true,
        route: true,

      },
      orderBy: { name: 'asc' },
    });

    return {
      status: 'success',
      count: students.length,
      students,
    };
  }


    async getNonRteByClass(class_id: string) {
    const students = await this.prisma.student.findMany({
      where: { class_id: Number(class_id) ,isRTE:false},
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        mobile: true,
        gender: true,
        community: true,
        father_name: true,
        DOB: true,
        route: true,
        class:true,
        school:{
          select:{
            name:true,
            address:true,
          }
        }

      },
      orderBy: { name: 'asc' },
    });

    return {
      status: 'success',
      count: students.length,
      students,
    };
  }
  async getAllByClassAndSchool(class_id: string, school_id: string) {
    const students = await this.prisma.student.findMany({
      where: { class_id: Number(class_id), school_id: Number(school_id) },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        mobile: true,
        gender: true,
        community: true,
        father_name: true,
        DOB: true,
        route: true,

      },
      orderBy: { name: 'asc' },
    });

    return {
      status: 'success',
      count: students.length,
      students,
    };
  }
  async countStudentsBySchool(schoolId: number): Promise<number> {
    return await this.prisma.student.count({
      where: {
        school_id: schoolId,
      },
    });
  }
  async getAllStudents(school_id?: string) {
    try {
      const whereClause =
        { school_id: Number(school_id) };

      const students = await this.prisma.student.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        select: {
          username: true,
          name: true,
          gender: true,
          email: true,
          mobile: true,
          class_id: true,
          community: true,
          father_name: true,
          DOB: true,
          route: true,

        },
      });

      return {
        status: 'success',
        students,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Query failed',
        details: error.message,
      };
    }
  }

  //   async getUsersWithLongestConsecutiveAbsentDays(params: {
  //   school_id?: number;
  //   class_id?: number;
  //   limit: number; // minimum streak length to consider
  // }) {
  //   const { school_id, class_id, limit } = params;

  //   if (!limit || limit < 1) {
  //     throw new Error('limit parameter must be a positive integer');
  //   }

  //   const where: any = {
  //     OR: [{ fn_status: 'A' }, { an_status: 'A' }],
  //   };
  //   if (school_id !== undefined) where.school_id = Number(school_id);
  //   if (class_id !== undefined) where.class_id = Number(class_id);

  //   const records = await this.prisma.studentAttendance.findMany({
  //     where,
  //     select: {
  //       username: true,
  //       date: true,
  //     },
  //     orderBy: [{ username: 'asc' }, { date: 'asc' }],
  //   });

  //   const grouped: Record<string, Date[]> = {};
  //   for (const rec of records) {
  //     if (!grouped[rec.username]) grouped[rec.username] = [];
  //     grouped[rec.username].push(new Date(rec.date));
  //   }

  //   const result: { username: string; dates: string[] }[] = [];

  //   for (const [username, dates] of Object.entries(grouped)) {
  //     dates.sort((a, b) => a.getTime() - b.getTime());

  //     let maxStreakStartIndex = 0;
  //     let maxStreakLength = 1;

  //     let currentStreakStartIndex = 0;
  //     let currentStreakLength = 1;

  //     for (let i = 1; i < dates.length; i++) {
  //       const diff =
  //         (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
  //       if (diff === 1) {
  //         // Consecutive day
  //         currentStreakLength++;
  //       } else {
  //         // Sequence breaks here, check if current streak is longest
  //         if (currentStreakLength > maxStreakLength) {
  //           maxStreakLength = currentStreakLength;
  //           maxStreakStartIndex = currentStreakStartIndex;
  //         }
  //         // Reset to new streak
  //         currentStreakStartIndex = i;
  //         currentStreakLength = 1;
  //       }
  //     }

  //     // After loop, check last streak
  //     if (currentStreakLength > maxStreakLength) {
  //       maxStreakLength = currentStreakLength;
  //       maxStreakStartIndex = currentStreakStartIndex;
  //     }

  //     // Include only if streak is at least `limit`
  //     if (maxStreakLength >= limit) {
  //       const streakDates = dates
  //         .slice(maxStreakStartIndex, maxStreakStartIndex + maxStreakLength)
  //         .map((d) => d.toISOString().split('T')[0]);

  //       result.push({
  //         username,
  //         dates: streakDates,
  //       });
  //     }
  //   }

  //   // Fetch student details for usernames in results
  //   const usernames = result.map((r) => r.username);

  //   const students = await this.prisma.student.findMany({
  //     where: {
  //       username: { in: usernames },
  //       ...(school_id !== undefined && { school_id: Number(school_id) }),
  //     },
  //     select: {
  //       username: true,
  //       name: true,
  //       mobile: true,
  //       gender:true,
  //       class_id:true,
  //     },
  //   });

  //   const studentMap = new Map(students.map((s) => [s.username, s]));

  //   // Add name and mobile to result objects
  //   const enrichedResult = result.map((r) => ({
  //     ...r,
  //     name: studentMap.get(r.username)?.name || null,
  //     mobile: studentMap.get(r.username)?.mobile || null,
  //   }));

  //   return enrichedResult;
  // }
  async getUsersWithLongestConsecutiveAbsentDays(params: {
    school_id?: number;
    class_id?: number;
    limit: number;
  }) {
    const { school_id, class_id, limit } = params;

    if (!limit || limit < 1) {
      throw new Error('limit parameter must be a positive integer');
    }

    const where: any = {
      OR: [{ fn_status: 'A' }, { an_status: 'A' }],
    };
    if (school_id !== undefined) where.school_id = Number(school_id);
    if (class_id !== undefined) where.class_id = Number(class_id);

    const records = await this.prisma.studentAttendance.findMany({
      where,
      select: {
        username: true,
        date: true,
      },
      orderBy: [{ username: 'asc' }, { date: 'asc' }],
    });

    const grouped: Record<string, Date[]> = {};
    for (const rec of records) {
      if (!grouped[rec.username]) grouped[rec.username] = [];
      grouped[rec.username].push(new Date(rec.date));
    }

    const result: { username: string; dates: string[] }[] = [];

    for (const [username, dates] of Object.entries(grouped)) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      let maxStreakStartIndex = 0;
      let maxStreakLength = 1;
      let currentStreakStartIndex = 0;
      let currentStreakLength = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreakLength++;
        } else {
          if (currentStreakLength > maxStreakLength) {
            maxStreakLength = currentStreakLength;
            maxStreakStartIndex = currentStreakStartIndex;
          }
          currentStreakStartIndex = i;
          currentStreakLength = 1;
        }
      }
      if (currentStreakLength > maxStreakLength) {
        maxStreakLength = currentStreakLength;
        maxStreakStartIndex = currentStreakStartIndex;
      }
      if (maxStreakLength >= limit) {
        const streakDates = dates
          .slice(maxStreakStartIndex, maxStreakStartIndex + maxStreakLength)
          .map((d) => d.toISOString().split('T')[0]);

        result.push({
          username,
          dates: streakDates,
        });
      }
    }

    // Fetch student details for usernames in results
    const usernames = result.map((r) => r.username);

    const students = await this.prisma.student.findMany({
      where: {
        username: { in: usernames },
        ...(school_id !== undefined && { school_id: Number(school_id) }),
      },
      select: {
        username: true,
        name: true,
        mobile: true,
        gender: true,
        class_id: true,
      },
    });

    const studentMap = new Map(students.map((s) => [s.username, s]));

    // Add name, mobile, gender, class_id, class, section to result objects
    const enrichedResult = await Promise.all(
      result.map(async (r) => {
        const student = studentMap.get(r.username);
        let classDetails: { class: string | null; section: string | null } = { class: null, section: null };


        if (typeof student?.class_id === 'number') {
          try {
            classDetails = await this.findClassName(student.class_id, Number(school_id));
          } catch (e) {
            // If not found, keep as null
          }
        }
        return {
          ...r,
          name: student?.name || null,
          mobile: student?.mobile || null,
          gender: student?.gender || null,
          class_id: student?.class_id || null,
          class: classDetails.class,
          section: classDetails.section,
        };

      })
    );

    return enrichedResult;
  }
  async findClassName(classId: number, schoolId: number) {
    const cls = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        school_id: schoolId,
      },
      select: {
        class: true,
        section: true,
      },
    });

    if (!cls) {
      throw new NotFoundException('Class not found for given class_id and school_id');
    }

    return {
      class: cls.class,
      section: cls.section,
    };
  }

  async getStudentsWithLowAttendance(params: {
    school_id?: number;
    class_id?: number;
    thresholdPercent: number; // e.g. 50 for 50%
  }) {
    const { school_id, class_id, thresholdPercent } = params;
    if (thresholdPercent < 0 || thresholdPercent > 100) {
      throw new Error('thresholdPercent must be between 0 and 100');
    }

    // Build filtering for school and class
    const where: any = {};
    if (school_id !== undefined) where.school_id = Number(school_id);
    if (class_id !== undefined) where.class_id = Number(class_id);

    // Fetch all attendance records for filtered students
    const records = await this.prisma.studentAttendance.findMany({
      where,
      select: {
        username: true,
        fn_status: true,
        an_status: true,
      },
      orderBy: { username: 'asc' },
    });

    // Group records by user
    const grouped: Record<
      string,
      { presentCount: number; totalCount: number }
    > = {};

    for (const rec of records) {
      if (!grouped[rec.username]) {
        grouped[rec.username] = { presentCount: 0, totalCount: 0 };
      }
      const userStats = grouped[rec.username];

      // Each record (day) counts as 2 half-days
      userStats.totalCount += 2;
      console.log(`Processing record for ${rec.username}: fn_status=${rec.fn_status}, an_status=${rec.an_status}`);


      // Count present halves
      if (rec.fn_status === 'P') userStats.presentCount += 1;
      if (rec.an_status === 'P') userStats.presentCount += 1;
    }

    // Calculate percentage and filter users below or equal threshold
    const result = Object.entries(grouped)
      .map(([username, stats]) => {
        const percentage = (stats.presentCount / stats.totalCount) * 100;
        return { username, percentage };
      })
      .filter((user) => user.percentage <= thresholdPercent)
      .sort((a, b) => a.percentage - b.percentage); // optional: lowest attendance first

    return result;
  }

  async findStudentByUsernameClassSchool(
    username: string,
    classId: number,
    schoolId: number,
  ) {
    return this.prisma.student.findFirst({
      where: {
        username,
        class_id: classId,
        school_id: schoolId,
      },
      select: {
        name: true,
        gender: true,
        email: true,
        mobile: true,
        community: true,
        father_name: true,
        DOB: true,
        route: true,

      },
    });
  }
  async updateStudent(
    username: string,
    data: UpdateStudentDto,
    school_id: string
  ): Promise<{ status: string; student?: any; message?: string }> {
    // Find the student by composite unique key (username + school_id)
    const student = await this.prisma.student.findUnique({
      where: { username_school_id: { username, school_id: Number(school_id) } },
    });

    if (!student) {
      return { status: 'error', message: 'Student not found' };
    }

    const { photo, DOB, ...restDto } = data;

    // Prepare update data
    //const updateData: any = { ...restDto };
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.toUpperCase();
    if (data.father_name !== undefined) updateData.father_name = data.father_name.toUpperCase();
    if (data.community !== undefined) updateData.community = data.community.toUpperCase();
    if (data.route !== undefined) updateData.route = data.route.toUpperCase();
    if (data.DOB !== undefined) updateData.DOB = data.DOB;

    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.gender !== undefined) updateData.gender = data.gender.toUpperCase();
    if (data.email !== undefined) updateData.email = data.email;
    if (data.photo) updateData.photo = Buffer.from(data.photo, 'base64');
    // Handle photo conversion from base64 string to Buffer, if provided
    if (photo) {
      try {
        updateData.photo = Buffer.from(photo, 'base64');
      } catch (e) {
        return { status: 'error', message: 'Invalid photo format' };
      }
    }

    // Convert DOB string (e.g. '2025-09-27') to Date object to match Prisma DateTime expected format
    if (DOB) {
      const parsedDate = new Date(DOB);
      if (isNaN(parsedDate.getTime())) {
        return { status: 'error', message: 'Invalid DOB format' };
      }
      updateData.DOB = parsedDate;
    }

    try {
      const updated = await this.prisma.student.update({
        where: { username_school_id: { username, school_id: Number(school_id) } },
        data: updateData,
      });

      return { status: 'success', student: updated };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }
  async countUsage(schoolId: string): Promise<number> {
    const grouped = await this.prisma.studentAttendance.groupBy({
      by: ['date'],
      where: {
        school_id: Number(schoolId),
      },
    });

    return grouped.length;
  }


}
