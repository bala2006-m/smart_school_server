import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfigService } from './database/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private static hasLoggedInit = false;
  private static hasLoggedDestroy = false;

  constructor(private readonly dbConfig: DatabaseConfigService) {
    super();

    // Return a Proxy that intercepts all PrismaClient method calls and routes them to
    // the appropriate database client (cloud or local dual-write proxy) dynamically.
    return new Proxy(this, {
      get(target: any, prop: string | symbol) {
        // Handle internal Prisma properties typically accessed by NestJS or Prisma itself.
        if (
          typeof prop === 'symbol' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'logger' ||
          prop === 'dbConfig' ||
          (typeof prop === 'string' && (prop.startsWith('$') || prop.startsWith('_')))
        ) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }

        const dynamicClient = target.dbConfig.getDatabaseClient();
        return dynamicClient[prop];
      },
    });
  }

  async onModuleInit() {
    if (!PrismaService.hasLoggedInit) {
      this.logger.log('PrismaService initialized as dynamic proxy');
      PrismaService.hasLoggedInit = true;
    }
  }

  async onModuleDestroy() {
    if (!PrismaService.hasLoggedDestroy) {
      this.logger.log('PrismaService proxy destroyed');
      PrismaService.hasLoggedDestroy = true;
    }
  }
}
