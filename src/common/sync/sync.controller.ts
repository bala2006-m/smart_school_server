import { Controller, Get, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import { DatabaseConfigService } from '../database/database.config';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly dbConfig: DatabaseConfigService,
  ) {}

  @Get('status')
  getSyncStatus() {
    return {
      isHybridMode: this.dbConfig.isHybridMode(),
      isLocalAvailable: this.dbConfig.getConfig().isLocalAvailable,
      syncQueue: this.syncService.getSyncStatus(),
    };
  }

  @Post('full-sync')
  async triggerFullSync() {
    await this.syncService.syncAllData();
    return {
      status: 'success',
      message: 'Full synchronization triggered',
    };
  }

  @Post('test-connection')
  async testConnections() {
    const config = this.dbConfig.getConfig();
    const results = {
      cloud: await this.testConnection(config.cloudClient, 'Cloud'),
      local: config.localClient 
        ? await this.testConnection(config.localClient, 'Local')
        : { status: 'unavailable', message: 'Local client not initialized' },
    };

    return results;
  }

  private async testConnection(client: any, name: string): Promise<{ status: string; message: string }> {
    try {
      await client.$queryRaw`SELECT 1`;
      return { status: 'connected', message: `${name} database connected successfully` };
    } catch (error) {
      return { 
        status: 'error', 
        message: `${name} database connection failed: ${error.message}` 
      };
    }
  }
}
