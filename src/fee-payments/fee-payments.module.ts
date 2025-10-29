import { Module } from '@nestjs/common';
import { FeePaymentsService } from './fee-payments.service';
import { FeePaymentsController } from './fee-payments.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [FeePaymentsController],
  providers: [FeePaymentsService, PrismaService],
  exports: [FeePaymentsService],
})
export class FeePaymentsModule {}
