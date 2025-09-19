// leave-request.module.ts
import { Module } from '@nestjs/common';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';
import { PrismaService } from 'src/common/prisma.service';

@Module({
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService,PrismaService],
})
export class LeaveRequestModule {}
