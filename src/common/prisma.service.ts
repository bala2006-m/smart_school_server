import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfigService } from './database/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly dbConfig: DatabaseConfigService) {
    super();

    // Return a Proxy that intercepts all PrismaClient method calls and routes them to 
    // the appropriate database client (cloud or local dual-write proxy) dynamically.
    return new Proxy(this, {
      get(target: any, prop: string | symbol) {
        // Handle internal Prisma properties typically accessed by NestJS or Prisma itself
        if (
          typeof prop === 'symbol' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'logger' ||
          prop === 'dbConfig' ||
          (typeof prop === 'string' && (prop.startsWith('$') || prop.startsWith('_')))
        ) {
          // Bind function to target if it is a function to preserve `this` context
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }

        // For actual model calls (e.g. prisma.homework.findMany)
        // Delegate dynamically to what DatabaseConfigService provides
        const dynamicClient = target.dbConfig.getDatabaseClient();
        return dynamicClient[prop];
      }
    });
  }

  async onModuleInit() {
    // The DatabaseConfigService handles actual connection logic and retries, 
    // so PrismaService doesn't need to manually throw an error here.
    this.logger.log('✅ PrismaService initialized as global dynamic proxy');
  }

  async onModuleDestroy() {
    this.logger.log('🛑 PrismaService proxy destroyed');
  }
}
