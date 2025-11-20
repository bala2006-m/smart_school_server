import { Module } from '@nestjs/common';
import { RteFeesService } from './rte-fees.service';
import { RteFeesController } from './rte-fees.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [RteFeesController],
  providers: [RteFeesService, PrismaService],
})
export class RteFeesModule {}
