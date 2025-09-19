import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { LeaveRequestService, RoleType } from './leave-request.service';

@Controller('leave-request')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  // POST /leave-request
  @Post('create')
  async create(
    @Body()
    body: {
      username: string;
      role?: RoleType;
      school_id: number | string;
      class_id: number | string;
      from_date: string;
      to_date: string;
      reason?: string;
      email:string,
    },
  ) {
    // Parse dates and numeric fields
    const fromDate = new Date(body.from_date);
    const toDate = new Date(body.to_date);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from_date or to_date');
    }

    return this.leaveRequestService.createLeaveRequest({
      username: body.username,
      role: body.role,
      school_id: Number(body.school_id),
      class_id: Number(body.class_id),
      from_date: fromDate,
      to_date: toDate,
      reason: body.reason,
      email:body.email
    });
  }

  // GET /leave-request?school_id=...&class_id=...&status=...&username=...
  @Get('list')
  async findAll(
    @Query('school_id') school_id?: string,
  ) {
    const filters: {
      school_id?: number;
    } = {};

    if (school_id) filters.school_id = Number(school_id);

    return this.leaveRequestService.getLeaveRequests(filters);
  }

  // PATCH /leave-request/:id/status
 @Patch(':id/status')
async updateStatus(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { status: 'approved' | 'rejected'}
) {
  console.log('Body:', body);
  console.log('ID:', id);   
  if (!body || !body.status) {
    throw new BadRequestException('Status is required in the request body');
  }
  // Your service call
  return this.leaveRequestService.updateLeaveRequestStatus(id, body.status);
}
}
