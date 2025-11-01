import { Module } from '@nestjs/common';
import { BusFeePaymentService } from './bus-fee-payment.service';
import { BusFeePaymentController } from './bus-fee-payment.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [BusFeePaymentController],
  providers: [BusFeePaymentService, PrismaService],
})
export class BusFeePaymentModule {}
