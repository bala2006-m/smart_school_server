import { Module } from '@nestjs/common';
import { ClassTimetableService } from './class-timetable.service';
import { ClassTimetableController } from './class-timetable.controller';
import { PrismaService } from '../common/prisma.service';


@Module({
  controllers: [ClassTimetableController],
  providers: [ClassTimetableService, PrismaService],
})
export class ClassTimetableModule {}
