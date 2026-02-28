import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SimpleInitialSyncService } from './simple-initial-sync.service';
import { DatabaseConfigService } from '../database/database.config';

@Injectable()
export class StartupSyncService implements OnModuleInit {
  private readonly logger = new Logger(StartupSyncService.name);

  constructor(
    private readonly simpleInitialSyncService: SimpleInitialSyncService,
    private readonly dbConfig: DatabaseConfigService,
  ) {}

  async onModuleInit() {
    // Only run initial sync if in hybrid mode AND manually triggered
    if (!this.dbConfig.isHybridMode()) {
      this.logger.log('Not in hybrid mode, skipping initial sync');
      return;
    }

    this.logger.log('🚀 Application started - startup sync disabled. Sync will only run when triggered from frontend.');
    
    // Don't auto-start sync - wait for frontend login trigger
    this.logger.log('⏸️ Waiting for frontend login to trigger initial and periodic sync...');
  }

  private async performStartupSync(schoolId: number) {
    try {
      this.logger.log(`🔄 Starting SIMPLE initial sync for school ${schoolId}...`);

      const result = await this.simpleInitialSyncService.performSimpleInitialSync(schoolId);

      if (result.success) {
        this.logger.log(`🎉 SIMPLE initial sync completed successfully!`);
        this.logger.log(`📊 Synced: ${JSON.stringify(result.synced)}`);
      } else {
        this.logger.error(`❌ SIMPLE initial sync failed`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Startup sync failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Manual trigger for frontend - this is now the primary way to trigger sync
  async triggerManualSync(schoolId: number) {
    this.logger.log(`🔄 Frontend triggered sync for school ${schoolId}`);
    return await this.performStartupSync(schoolId);
  }
}
