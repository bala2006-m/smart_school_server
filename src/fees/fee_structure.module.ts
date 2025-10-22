import { Module } from '@nestjs/common';
import { FeeStructureService } from './fee_structure.service';
import { FeeStructureController } from './fee_structure.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [FeeStructureController],
  providers: [FeeStructureService, PrismaService],
  exports: [FeeStructureService],
})
export class FeeStructureModule {}
