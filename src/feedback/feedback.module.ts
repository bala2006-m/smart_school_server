import { Module } from '@nestjs/common';
import { FeedbackService,TicketsService } from './feedback.service';
import { FeedbackController,TicketsController } from './feedback.controller';
import { PrismaService } from '../common/prisma.service'; // Adjust path as needed

@Module({
  controllers: [FeedbackController,TicketsController],
  providers: [FeedbackService, PrismaService,TicketsService],
})
export class FeedbackModule {}
