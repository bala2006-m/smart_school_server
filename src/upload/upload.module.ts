import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { PrismaService } from '../common/prisma.service'; // ✅ Add this line

@Module({

  controllers: [UploadController],
  providers: [PrismaService],
})
export class UploadModule {}
