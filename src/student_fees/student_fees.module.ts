import { Module } from '@nestjs/common';
import { StudentFeesService } from './student_fees.service';
import { StudentFeesController } from './student_fees.controller';
import { PrismaService } from '../common/prisma.service';
@Module({
  controllers: [StudentFeesController],
  providers: [StudentFeesService, PrismaService],
})
export class StudentFeesModule {}
