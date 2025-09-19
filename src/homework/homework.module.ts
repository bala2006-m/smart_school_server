import { Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [HomeworkController],
  providers: [HomeworkService, PrismaService],
})
export class HomeworkModule {}
