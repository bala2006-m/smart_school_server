import { Module } from '@nestjs/common';
import { BlockedSchoolService } from './blocked-school.service';
import { BlockedSchoolController } from './blocked-school.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [BlockedSchoolController],
  providers: [BlockedSchoolService, PrismaService],
})
export class BlockedSchoolModule {}
