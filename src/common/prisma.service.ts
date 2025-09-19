import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Successfully connected to the database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to the database', error.stack || error.message);
      throw error; // Let NestJS crash app if DB is not connected
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🛑 Disconnected from the database');
  }
}
