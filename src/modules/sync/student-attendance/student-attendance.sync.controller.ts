import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { StudentAttendanceSyncService } from './student-attendance.sync.service';

@Controller('sync/student-attendance')
export class StudentAttendanceSyncController {
  constructor(private readonly service: StudentAttendanceSyncService) {}

  // 🔄 PULL FROM CLOUD
  @Get()
  async pull(
    @Query('school_id') school_id: string,
    @Query('lastSync') lastSync: string,
  ) {
    return this.service.pull(+school_id, lastSync);
  }

  // ⬆️ PUSH TO CLOUD
  @Post()
  async push(@Body() body: any[]) {
    return this.service.push(body);
  }
}
