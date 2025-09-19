import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import * as nodemailer from 'nodemailer';

export type RoleType = 'admin' | 'staff' | 'student';

@Injectable()
export class LeaveRequestService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new leave request
  async createLeaveRequest(data: {
    username: string;
    role?: RoleType;
    school_id: number;
    class_id: number;
    from_date: Date;
    to_date: Date;
    reason?: string;
    email:string;
  }) {
    if (data.from_date > data.to_date) {
      throw new BadRequestException('from_date cannot be later than to_date');
    }
    const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'Noreply.ramchintech@gmail.com',
            pass: 'zkvb rmyu yqtm ipgv',
          },
        });
    
        // // 3. Send email to admin
        // await transporter.sendMail({
        //   from: 'Noreply.ramchintech@gmail.com',
        //   to: data.email,
        //   subject: `New Leave Request Submitted `,
        //   html: `
        //     <p><strong>Username:</strong> ${data.username}</p>
        //     <p><strong>From:</strong> ${data.from_date}</p>
        //     <p><strong>To:</strong> ${data.to_date}</p>
        //     <p><strong>Reason:</strong> ${data.reason}</p>
        //   `,
        // });
    
        // 4. Send confirmation email to user
        await transporter.sendMail({
          from: 'Noreply.ramchintech@gmail.com',
          to: data.email,
          subject: 'Leave Request Submission Successful',
          html: `
            <h3>Leave Request Submitted Successfully</h3>
            <p>Dear ${data.username},</p>
            <p>Your Leave Request has been submitted successfully.</p>
<p>
  For ${data.reason} from 
  ${data.from_date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} 
  to 
  ${data.to_date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
</p>
            <p>Thank you!</p>
          `,
        });
    
    return this.prisma.leaveRequest.create({
      data: {
        username: data.username,
        role: data.role ?? 'student',
        school_id: data.school_id,
        class_id: data.class_id,
        from_date: data.from_date,
        to_date: data.to_date,
        reason: data.reason,
        status: 'pending',
      },
    });
  }

  // Get leave requests with optional filters
  async getLeaveRequests(filters: {
    school_id?: number;
  }) {
    const where: any = {};

    if (filters.school_id !== undefined) where.school_id = filters.school_id;

    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  // Update the status of a leave request (approve/reject)
  async updateLeaveRequestStatus(id: number, status: 'approved' | 'rejected') {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }
}
