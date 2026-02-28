import { Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { PrismaService } from '../common/prisma.service';

import { SyncModule } from '../common/sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [HomeworkController],
  providers: [HomeworkService, PrismaService],
})
export class HomeworkModule { }
