import { Injectable, Logger } from '@nestjs/common';
import { DatabaseConfigService } from '../database/database.config';

@Injectable()
export class CloudToLocalSyncService {
  private readonly logger = new Logger(CloudToLocalSyncService.name);
  private isSyncing = false;

  constructor(private readonly dbConfig: DatabaseConfigService) {}

  // Sync all new messages from cloud to local database
  async syncMessagesFromCloud(schoolId: number, lastSyncTime?: Date): Promise<{ synced: number; failed: number }> {
    if (!this.dbConfig.isHybridMode()) {
      this.logger.warn('Not in hybrid mode, skipping cloud-to-local sync');
      return { synced: 0, failed: 0 };
    }

    if (this.isSyncing) {
      this.logger.warn('Cloud-to-local sync already in progress');
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;

    try {
      const cloudClient = this.dbConfig.getCloudClient();
      const localClient = this.dbConfig.getLocalClient();

      if (!cloudClient || !localClient) {
        this.logger.error('Both cloud and local clients required for sync');
        this.isSyncing = false;
        return { synced: 0, failed: 0 };
      }

      // Get messages from cloud that are newer than last sync
      const whereClause: any = { school_id: schoolId };
      if (lastSyncTime) {
        whereClause.date = { gt: lastSyncTime as Date };
      }

      const cloudMessages = await cloudClient.messages.findMany({
        where: whereClause,
        orderBy: { date: 'asc' }, // Use 'date' field instead of 'createdAt'
        take: 100, // Limit to prevent large transfers
      });

      let syncedCount = 0;
      let failedCount = 0;

      this.logger.log(`Found ${cloudMessages.length} messages to sync from cloud to local`);

      for (const cloudMessage of cloudMessages) {
        try {
          // Check if message already exists locally
          const existingMessage = await localClient.messages.findUnique({
            where: { id: cloudMessage.id },
          });

          if (!existingMessage) {
            // Create message in local database
            await localClient.messages.create({
              data: {
                id: cloudMessage.id,
                messages: cloudMessage.messages,
                date: cloudMessage.date,
                school_id: cloudMessage.school_id,
                role: cloudMessage.role,
              },
            });

            syncedCount++;
            this.logger.log(`Synced message ${cloudMessage.id} to local database`);
          } else {
            this.logger.log(`Message ${cloudMessage.id} already exists locally, skipping`);
          }
        } catch (error) {
          failedCount++;
          this.logger.error(`Failed to sync message ${cloudMessage.id}: ${error.message}`);
        }
      }

      this.logger.log(`Cloud-to-local sync completed: ${syncedCount} synced, ${failedCount} failed`);
      
      return { synced: syncedCount, failed: failedCount };

    } catch (error) {
      this.logger.error(`Cloud-to-local sync failed: ${error.message}`);
      return { synced: 0, failed: 1 };
    } finally {
      this.isSyncing = false;
    }
  }

  // Get last sync time for a table
  async getLastSyncTime(tableName: string, schoolId: number): Promise<Date | null> {
    try {
      const localClient = this.dbConfig.getLocalClient();
      if (!localClient) return null;

      // Get the most recent record from local database
      let latestRecord: any = null;

      switch (tableName) {
        case 'Messages':
          latestRecord = await localClient.messages.findFirst({
            where: { school_id: schoolId },
            orderBy: { date: 'desc' }, // Use 'date' field
          });
          break;
        
        // Add more tables as needed
        default:
          return null;
      }

      return (latestRecord?.date as Date) || null;
    } catch (error) {
      this.logger.error(`Failed to get last sync time: ${error.message}`);
      return null;
    }
  }

  // Full sync for all new data from cloud to local
  async performFullCloudToLocalSync(schoolId: number): Promise<{ messages: number; total: number }> {
    this.logger.log(`Starting full cloud-to-local sync for school ${schoolId}`);

    try {
      const lastSyncTime = await this.getLastSyncTime('Messages', schoolId);
      const result = await this.syncMessagesFromCloud(schoolId, lastSyncTime || undefined);

      return {
        messages: result.synced,
        total: result.synced + result.failed,
      };
    } catch (error) {
      this.logger.error(`Full cloud-to-local sync failed: ${error.message}`);
      return { messages: 0, total: 0 };
    }
  }

  // Check sync status
  getSyncStatus(): {
    isHybridMode: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
  } {
    return {
      isHybridMode: this.dbConfig.isHybridMode(),
      isSyncing: this.isSyncing,
      lastSyncTime: null, // Could be stored in DB for persistence
    };
  }

  // Force sync from cloud to local
  async forceSyncFromCloud(schoolId: number): Promise<boolean> {
    this.logger.log(`Force syncing from cloud to local for school ${schoolId}`);
    
    try {
      const result = await this.performFullCloudToLocalSync(schoolId);
      return result.messages > 0;
    } catch (error) {
      this.logger.error(`Force sync from cloud failed: ${error.message}`);
      return false;
    }
  }
}
