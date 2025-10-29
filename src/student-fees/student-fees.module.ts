import { Module } from '@nestjs/common';
import { StudentFeesService } from './student-fees.service';
import { StudentFeesController } from './student-fees.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [StudentFeesController],
  providers: [StudentFeesService, PrismaService],
  exports: [StudentFeesService],
})
export class StudentsFeesModule {}
