import { Module } from '@nestjs/common';
import { StudentAttendanceSyncController } from './student-attendance.sync.controller';
import { StudentAttendanceSyncService } from './student-attendance.sync.service';
import { PrismaService } from '../../../common/prisma.service';

@Module({
  controllers: [StudentAttendanceSyncController],
  providers: [StudentAttendanceSyncService, PrismaService],
})
export class StudentAttendanceSyncModule {}
