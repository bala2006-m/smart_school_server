import { Module } from '@nestjs/common';
import { AppPaymentController } from './app_payment.controller';
import { AppPaymentService } from './app_payment.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AppPaymentController],
  providers: [AppPaymentService, PrismaService],
})
export class AppPaymentModule {}
