import { Module } from '@nestjs/common';
import { ExamMarksService } from './exam-marks.service';
import { ExamMarksController } from './exam-marks.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [ExamMarksController],
  providers: [ExamMarksService, PrismaService],
})
export class ExamMarksModule {}
