import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(school_id: number, date: string) {
    const d = new Date(date);

    const totalStudents = await this.prisma.student.count({ where: { school_id: school_id }
 });

    const studentAttendance = await this.prisma.studentAttendance.groupBy({
      by: ['fn_status', 'an_status'],
      where: { school_id, date: d },
      _count: true,
    });

    const totalStaff = await this.prisma.staff.count({ where: { school_id } });

    const staffAttendance = await this.prisma.staffAttendance.groupBy({
      by: ['fn_status', 'an_status'],
      where: { school_id, date: d },
      _count: true,
    });

    const countStatus = (group, status, session) =>
      group
        .filter((g) => g[`${session}_status`] === status)
        .reduce((acc, g) => acc + g._count, 0);

    return {
      status: 'success',
      school_id,
      date,
      summary: {
        students: {
          total: totalStudents,
          fn_present: countStatus(studentAttendance, 'P', 'fn'),
          fn_absent: countStatus(studentAttendance, 'A', 'fn'),
          an_present: countStatus(studentAttendance, 'P', 'an'),
          an_absent: countStatus(studentAttendance, 'A', 'an'),
        },
        staff: {
          total: totalStaff,
          fn_present: countStatus(staffAttendance, 'P', 'fn'),
          fn_absent: countStatus(staffAttendance, 'A', 'fn'),
          an_present: countStatus(staffAttendance, 'P', 'an'),
          an_absent: countStatus(staffAttendance, 'A', 'an'),
        },
      },
    };
  }

  async getClassSummary(school_id: number, date: string) {
    const d = new Date(date);

    const classGroups = await this.prisma.student.groupBy({
      by: ['class_id'],
      where: { school_id: Number(school_id) },
      _count: { id: true },
    });

    const attendance = await this.prisma.studentAttendance.groupBy({
      by: ['class_id', 'fn_status', 'an_status'],
      where: { school_id, date: d },
      _count: true,
    });

    const buildClassSummary = (class_id: number) => {
      const total = classGroups.find((c) => c.class_id === Number(class_id))?._count.id ?? 0;

      const fnPresent = attendance
        .filter((a) => a.class_id == class_id && a.fn_status == 'P')
        .reduce((acc, a) => acc + a._count, 0);
      const fnAbsent = attendance
        .filter((a) => a.class_id === class_id && a.fn_status === 'A')
        .reduce((acc, a) => acc + a._count, 0);

      const anPresent = attendance
        .filter((a) => a.class_id === class_id && a.an_status === 'P')
        .reduce((acc, a) => acc + a._count, 0);
      const anAbsent = attendance
        .filter((a) => a.class_id === class_id && a.an_status === 'A')
        .reduce((acc, a) => acc + a._count, 0);

      return {
        class_id,
        total_students: total,
        fn_present: fnPresent,
        fn_absent: fnAbsent,
        an_present: anPresent,
        an_absent: anAbsent,
      };
    };

    const summary = classGroups.map((g) => buildClassSummary(g.class_id));

    return {
      status: 'success',
      school_id,
      date,
      summary,
    };
  }
}
