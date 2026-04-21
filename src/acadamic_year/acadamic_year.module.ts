import { Module } from '@nestjs/common';
 
import { PrismaService } from '../common/prisma.service';
import { AcadamicYearController } from './acadamic_year.controller';
import { AcadamicYearService } from './acadamic_year.service';
 
@Module({
  controllers: [AcadamicYearController],
  providers: [AcadamicYearService, PrismaService],
})
export class AcadamicYearModule {}
