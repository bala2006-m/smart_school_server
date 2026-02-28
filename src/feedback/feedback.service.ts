import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as nodemailer from 'nodemailer';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async createFeedback(data: {
    name: string;
    username: string;
    email: string;
    feedback: string;
    school_id: number;
    class_id: number;
  }) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feedback.create({ data });
  }

  async getFeedbackBySchool(params: {
    school_id: number;
  }) {
    const { school_id } = params;
    const schoolId = Number(school_id);
    const where: any = { school_id: schoolId };

    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).feedback.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }
}
@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async createTickets(data1: {
    username: string;
    name: string;
    email: string;
    tickets: string;
    school_id: number;
  }) {
    // 1. Create ticket in DB
    const client = this.dbConfig.getDatabaseClient(this.request);
    const ticket = await (client as any).tickets.create({ data: data1 });

    // 2. Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'Noreply.ramchintech@gmail.com',
        pass: 'zkvb rmyu yqtm ipgv',
      },
    });

    // 3. Send email to admin
    await transporter.sendMail({
      from: '"School Ticket System" Noreply.ramchintech@gmail.com',
      to: 'ramchintech@gmail.com',
      subject: `New Ticket Submitted by ${data1.name}`,
      html: `
        <h3>New Ticket Submitted</h3>
        <p><strong>School ID:</strong> ${data1.school_id}</p>
        <p><strong>Username:</strong> ${data1.username}</p>
        <p><strong>Name:</strong> ${data1.name}</p>
        <p><strong>Email:</strong> ${data1.email}</p>
        <p><strong>Tickets:</strong> ${data1.tickets}</p>
        <p><strong>Status:</strong> Pending</p>
      `,
    });

    // 4. Send confirmation email to user
    await transporter.sendMail({
      from: '"School Ticket System" Noreply.ramchintech@gmail.com',
      to: data1.email,
      subject: 'Ticket Submission Successful',
      html: `
        <h3>Ticket Submitted Successfully</h3>
        <p>Dear ${data1.name},</p>
        <p>Your ticket has been submitted successfully. We will get back to you soon.</p>
        <p><strong>Ticket Details:</strong></p>
        <p>${data1.tickets}</p>
        <p>Thank you!</p>
      `,
    });

    return ticket;
  }

  async getTicketsBySchool(params: { school_id: number }) {
    const { school_id } = params;
    const schoolId = Number(school_id);
    const where: any = { school_id: schoolId };

    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).tickets.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }
}
