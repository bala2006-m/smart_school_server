import { Module } from '@nestjs/common';
import { BusFeeStructureService } from './bus-fee-structure.service';
import { BusFeeStructureController } from './bus-fee-structure.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [BusFeeStructureController],
  providers: [BusFeeStructureService, PrismaService],
})
export class BusFeeStructureModule {}
