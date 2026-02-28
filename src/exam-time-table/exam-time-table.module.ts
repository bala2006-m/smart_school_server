import { Module } from '@nestjs/common';
import { ExamTimeTableService } from './exam-time-table.service';
import { ExamTimeTableController } from './exam-time-table.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [ExamTimeTableController],
  providers: [ExamTimeTableService, PrismaService],
})
export class ExamTimeTableModule {}
