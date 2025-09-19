import { Module } from '@nestjs/common';
import { AttendanceUserService } from './attendance-user.service';
import { AttendanceUserController } from './attendance-user.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AttendanceUserController],
  providers: [AttendanceUserService, PrismaService],
})
export class AttendanceUserModule {}
