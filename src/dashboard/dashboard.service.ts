import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async getSummary(school_id: number, date: string) {
    const d = new Date(date);

    const client = this.dbConfig.getDatabaseClient(this.request);
    const totalStudents = await (client as any).student.count({
      where: { school_id: school_id }
    });

    const studentAttendance = await (client as any).studentAttendance.groupBy({
      by: ['fn_status', 'an_status'],
      where: { school_id, date: d },
      _count: true,
    });

    const totalStaff = await (client as any).staff.count({ where: { school_id } });

    const staffAttendance = await (client as any).staffAttendance.groupBy({
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

    const client = this.dbConfig.getDatabaseClient(this.request);
    const classGroups = await (client as any).student.groupBy({
      by: ['class_id'],
      where: { school_id: Number(school_id) },
      _count: { id: true },
    });

    const attendance = await (client as any).studentAttendance.groupBy({
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

  async getAttendanceTrends(school_id: number, startDate: string, endDate: string, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const where: any = { school_id, date: { gte: new Date(startDate), lte: new Date(endDate) } };
    if (class_id) where.class_id = class_id;

    const attendance = await (client as any).studentAttendance.findMany({ where });

    const trends = {};
    attendance.forEach(att => {
      const month = `${att.date.getFullYear()}-${String(att.date.getMonth() + 1).padStart(2, '0')}`;
      if (!trends[month]) trends[month] = { present: 0, absent: 0, total: 0 };
      if (att.fn_status === 'P') trends[month].present += 0.5;
      else trends[month].absent += 0.5;
      trends[month].total += 0.5;
      if (att.an_status === 'P') trends[month].present += 0.5;
      else trends[month].absent += 0.5;
      trends[month].total += 0.5;
    });

    return { status: 'success', school_id, trends };
  }

  async getFeeCollectionTrends(school_id: number, startDate: string, endDate: string, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const where: any = { school_id, createdAt: { gte: new Date(startDate), lte: new Date(endDate) } };
    if (class_id) where.class_id = class_id;

    const fees = await (client as any).studentFees.findMany({ where, include: { payments: true } });

    const trends = {};
    fees.forEach(fee => {
      const month = `${fee.createdAt.getFullYear()}-${String(fee.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!trends[month]) trends[month] = { total: 0, collected: 0 };
      trends[month].total += fee.total_amount;
      trends[month].collected += fee.paid_amount;
    });

    return { status: 'success', school_id, trends };
  }

  async getExamPerformanceTrends(school_id: number, startDate: string, endDate: string, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const where: any = { school_id, created_at: { gte: new Date(startDate), lte: new Date(endDate) } };
    if (class_id) where.class_id = class_id;

    const exams = await (client as any).examMarks.findMany({ where });

    const trends = {};
    exams.forEach(exam => {
      const month = `${exam.created_at.getFullYear()}-${String(exam.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (!trends[month]) trends[month] = { total_marks: 0, count: 0 };
      const marks = (exam.marks || {}) as Record<string, number>;
      const avgMark = Object.values(marks).reduce((sum: number, m: number) => sum + m, 0) / Object.keys(marks).length || 0;
      trends[month].total_marks += avgMark;
      trends[month].count += 1;
    });

    // Calculate averages
    Object.keys(trends).forEach(month => {
      trends[month].average = trends[month].count > 0 ? trends[month].total_marks / trends[month].count : 0;
    });

    return { status: 'success', school_id, trends };
  }

  async getClassComparisons(school_id: number, date: string) {
    const d = new Date(date);
    const client = this.dbConfig.getDatabaseClient(this.request);

    const classes = await (client as any).classes.findMany({ where: { school_id } });

    const comparisons = await Promise.all(classes.map(async (cls) => {
      const attendance = await (client as any).studentAttendance.groupBy({
        by: ['fn_status', 'an_status'],
        where: { school_id, class_id: cls.id, date: d },
        _count: true,
      });

      const present = attendance.filter(a => a.fn_status === 'P' || a.an_status === 'P').reduce((sum, a) => sum + a._count, 0);
      const absent = attendance.filter(a => a.fn_status === 'A' || a.an_status === 'A').reduce((sum, a) => sum + a._count, 0);
      const attendance_rate = (present / (present + absent)) * 100 || 0;

      const fees = await (client as any).studentFees.findMany({ where: { school_id, class_id: cls.id } });
      const totalFees = fees.reduce((sum, f) => sum + f.total_amount, 0);
      const collectedFees = fees.reduce((sum, f) => sum + f.paid_amount, 0);
      const fee_rate = totalFees > 0 ? (collectedFees / totalFees) * 100 : 0;

      const exams = await (client as any).examMarks.findMany({ where: { school_id, class_id: cls.id } });
      const avgMarks = exams.length > 0 ? exams.reduce((sum, e) => {
        const marks = (e.marks || {}) as Record<string, number>;
        const avg = Object.values(marks).reduce((s: number, m: number) => s + m, 0) / Object.keys(marks).length || 0;
        return sum + avg;
      }, 0) / exams.length : 0;

      return { class_id: cls.id, class_name: cls.class + ' ' + cls.section, attendance_rate, fee_rate, avg_marks: avgMarks };
    }));

    return { status: 'success', school_id, date, comparisons };
  }

  async getPredictiveInsights(school_id: number, class_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const where: any = { school_id };
    if (class_id) where.class_id = class_id;

    const students = await (client as any).student.findMany({ where, include: { attendance: true, studentFees: true, class: true } });

    // Fetch examMarks for all students
    const usernames = students.map(s => s.username);
    const examMarks = await (client as any).examMarks.findMany({ where: { username: { in: usernames }, school_id } });
    const examMarksMap = examMarks.reduce((map, em) => {
      if (!map[em.username]) map[em.username] = [];
      map[em.username].push(em);
      return map;
    }, {});

    const insights = students.map(student => {
      const studentExamMarks = examMarksMap[student.username] || [];
      const totalDays = student.attendance.length * 2; // fn and an
      const presentDays = student.attendance.reduce((sum, a) => {
        return sum + (a.fn_status === 'P' ? 1 : 0) + (a.an_status === 'P' ? 1 : 0);
      }, 0);
      const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      const avgMarks = studentExamMarks.length > 0 ? studentExamMarks.reduce((sum, e) => {
        const marks = (e.marks || {}) as Record<string, number>;
        const avg = Object.values(marks).reduce((s: number, m: number) => s + m, 0) / Object.keys(marks).length || 0;
        return sum + avg;
      }, 0) / studentExamMarks.length : 0;

      const engagement = (attendancePercent * 0.5) + (avgMarks * 0.5); // Simple score

      return { username: student.username, name: student.name, class: student.class?.name || 'Unknown', gender: student.gender || 'Unknown', attendance_percent: attendancePercent, avg_marks: avgMarks, engagement_score: engagement };
    });

    return { status: 'success', school_id, insights };
  }

  
}


