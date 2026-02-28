import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PrismaService } from '../common/prisma.service';

import { SyncModule } from '../common/sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [MessagesController],
  providers: [MessagesService, PrismaService],
})
export class MessagesModule { }
