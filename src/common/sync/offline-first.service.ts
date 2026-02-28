import { Injectable, Logger } from '@nestjs/common';
import { DatabaseConfigService } from '../database/database.config';
import { SyncService } from './sync.service';
import { SchoolSyncService } from './school-sync.service';

export interface OfflineOperation {
  id: string;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
  retryCount: number;
}

@Injectable()
export class OfflineFirstService {
  private readonly logger = new Logger(OfflineFirstService.name);
  private pendingOperations: OfflineOperation[] = [];
  private isOnline = true;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly dbConfig: DatabaseConfigService,
    public readonly syncService: SyncService,
    private readonly schoolSyncService: SchoolSyncService,
  ) {
    this.initializeOfflineMode();
  }

  private initializeOfflineMode() {
    // Start periodic sync when online
    this.startPeriodicSync();

    // Check connectivity status
    this.checkConnectivity();
  }

  // Check if we're in desktop mode with local database
  isDesktopOfflineMode(): boolean {
    return this.dbConfig.isHybridMode();
  }

  // Store data locally first (for desktop users)
  async storeLocally(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<any> {
    // For web requests in hybrid mode, also store locally
    const shouldStoreLocally = this.isDesktopOfflineMode();

    if (!shouldStoreLocally) {
      // For mobile/cloud-only mode, just use regular sync
      return this.syncService.addToSyncQueue({
        tableName,
        operation,
        data,
        source: 'cloud',
      });
    }

    try {
      // Store in local database first
      const localClient = this.dbConfig.getLocalClient();
      if (!localClient) {
        throw new Error('Local database not available');
      }

      const result = await this.executeLocalOperation(localClient, tableName, operation, data);

      // Add to pending operations for cloud sync
      const offlineOp: OfflineOperation = {
        id: this.generateOperationId(),
        tableName,
        operation,
        data,
        timestamp: new Date(),
        synced: false,
        retryCount: 0,
      };

      this.pendingOperations.push(offlineOp);
      this.logger.log(`Stored locally and queued for cloud sync: ${tableName} - ${operation}`);

      // Try to sync immediately if online
      if (this.isOnline) {
        await this.syncToCloud(offlineOp);
      }

      return result;
    } catch (error) {
      // Handle foreign key constraint errors
      if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
        this.logger.warn(`Foreign key constraint in local DB, attempting to resolve: ${error.message}`);

        // Extract school_id from data if available
        const schoolId = data.school_id;
        if (schoolId) {
          this.logger.log(`Attempting to sync school data for school_id: ${schoolId}`);

          // Try to sync school data first
          const schoolSyncSuccess = await this.schoolSyncService.quickSyncSchool(schoolId);

          if (schoolSyncSuccess) {
            this.logger.log(`School data synced successfully, retrying local operation`);

            // Retry the local operation after school sync
            try {
              const localClient = this.dbConfig.getLocalClient();
              if (localClient) {
                const result = await this.executeLocalOperation(localClient, tableName, operation, data);

                // Add to pending operations for cloud sync
                const offlineOp: OfflineOperation = {
                  id: this.generateOperationId(),
                  tableName,
                  operation,
                  data,
                  timestamp: new Date(),
                  synced: false,
                  retryCount: 0,
                };

                this.pendingOperations.push(offlineOp);
                this.logger.log(`Successfully stored locally after school sync: ${tableName} - ${operation}`);

                // Try to sync immediately if online
                if (this.isOnline) {
                  await this.syncToCloud(offlineOp);
                }

                return result;
              }
            } catch (retryError) {
              this.logger.error(`Retry failed after school sync: ${retryError.message}`);
            }
          }
        }

        this.logger.warn(`Could not resolve foreign key constraint, falling back to cloud-only`);

        // Fallback to cloud-only storage
        return this.syncService.addToSyncQueue({
          tableName,
          operation,
          data,
          source: 'cloud',
        });
      }

      this.logger.error(`Failed to store locally: ${error.message}`);
      throw error;
    }
  }

  private async executeLocalOperation(
    client: any,
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<any> {
    const model = this.getModelFromTableName(client, tableName);

    // Tables that have sync_status field
    const tablesWithSyncStatus = [
      'Finance', 'StudentFees', 'FeePayments', 'StaffAttendance',
      'StudentAttendance', 'LeaveRequest', 'Homework', 'Classes',
      'School', 'Holidays', 'Feedback', 'Tickets', 'ExamMarks',
      'ExamTimeTable', 'FeeStructure', 'BusFeeStructure', 'BusFeePayment',
      'RteStructure', 'RteFeePayment', 'ImageAndVideos', 'ClassTimetable',
      'AppPayment', 'BlockedSchool', 'RealTimeMessage', 'Attendance_user'
    ];

    const hasSyncStatus = tablesWithSyncStatus.includes(tableName);

    switch (operation) {
      case 'create':
        // Special handling for Messages table - ensure required fields
        let createData = { ...data };

        if (tableName === 'Messages') {
          // Ensure Messages table has required fields
          if (!createData.date) {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
            createData.date = `${year}-${month}-${day} ${hours}:${minutes}`;
          }

          // Ensure role is set
          if (!createData.role) {
            createData.role = 'admin'; // Default role
          }
        }

        // Only add sync_status if the table has this field
        const finalCreateData = hasSyncStatus
          ? { ...createData, sync_status: 'pending' }
          : createData;

        return await model.create({
          data: finalCreateData
        });

      case 'update':
        const whereClause = this.getWhereClause(tableName, data);
        const { id: _, ...updateData } = data; // Exclude ID from data if present

        // Only add sync_status if the table has this field
        const finalUpdateData = hasSyncStatus
          ? { ...updateData, sync_status: 'pending' }
          : updateData;

        return await model.update({
          where: whereClause,
          data: finalUpdateData
        });

      case 'delete':
        const deleteWhere = this.getWhereClause(tableName, data);

        // For delete, we'll use soft delete if the table supports it
        if (hasSyncStatus) {
          return await model.update({
            where: deleteWhere,
            data: { is_deleted: true, sync_status: 'pending' }
          });
        }

        return await model.delete({
          where: deleteWhere
        });

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private getModelFromTableName(client: any, tableName: string): any {
    const modelMap: Record<string, any> = {
      'Student': client.student,
      'Staff': client.staff,
      'Admin': client.admin,
      'StudentAttendance': client.studentAttendance,
      'StaffAttendance': client.staffAttendance,
      'StudentFees': client.studentFees,
      'FeePayments': client.feePayments,
      'Finance': client.finance,
      'LeaveRequest': client.leaveRequest,
      'Homework': client.homework,
      'Classes': client.classes,
      'School': client.school,
      'Holidays': client.holidays,
      'Messages': client.messages,
      'Feedback': client.feedback,
      'Tickets': client.tickets,
      'ExamMarks': client.examMarks,
      'ExamTimeTable': client.examTimeTable,
      'FeeStructure': client.feeStructure,
      'BusFeeStructure': client.busFeeStructure,
      'BusFeePayment': client.busFeePayment,
      'RteStructure': client.rteStructure,
      'RteFeePayment': client.rteFeePayment,
      'ImageAndVideos': client.imageAndVideos,
      'ClassTimetable': client.classTimetable,
      'AppPayment': client.appPayment,
      'BlockedSchool': client.blockedSchool,
      'RealTimeMessage': client.realTimeMessage,
      'Attendance_user': client.attendance_user,
    };

    const model = modelMap[tableName];
    if (!model) {
      throw new Error(`Unknown table name: ${tableName}`);
    }
    return model;
  }

  private getWhereClause(tableName: string, data: any): any {
    // Handle specific tables with composite unique keys
    switch (tableName) {
      case 'StudentAttendance':
        return {
          username_school_date: {
            username: data.username,
            school_id: parseInt(data.school_id),
            date: new Date(data.date)
          }
        };
      case 'StaffAttendance':
        return {
          username_school_date_staff: {
            username: data.username,
            school_id: parseInt(data.school_id),
            date: new Date(data.date)
          }
        };
      case 'ExamMarks':
        return {
          unique_exam_per_student: {
            school_id: parseInt(data.school_id),
            class_id: parseInt(data.class_id),
            username: data.username,
            title: data.title
          }
        };
      case 'FeeStructure':
        return {
          unique_fee_per_class: {
            school_id: parseInt(data.school_id),
            class_id: parseInt(data.class_id),
            title: data.title
          }
        };
      case 'ClassTimetable':
        return {
          schoolId_classesId_dayOfWeek_periodNumber: {
            schoolId: parseInt(data.school_id || data.schoolId),
            classesId: parseInt(data.class_id || data.classesId),
            dayOfWeek: data.dayOfWeek,
            periodNumber: parseInt(data.periodNumber)
          }
        };
      case 'ExamTimeTable':
        return {
          unique_exam_per_student: {
            school_id: parseInt(data.school_id),
            class_id: parseInt(data.class_id),
            exam_title: data.exam_title || data.title
          }
        };
      case 'Attendance_user':
      case 'Student':
      case 'Staff':
      case 'Admin':
        if (data.username && data.school_id) {
          return {
            username_school_id: {
              username: data.username,
              school_id: parseInt(data.school_id)
            }
          };
        }
        return { id: data.id };
      default:
        // Default to id
        return { id: data.id };
    }
  }

  // Sync pending operations to cloud
  async syncToCloud(operation?: OfflineOperation): Promise<void> {
    const operationsToSync = operation ? [operation] : this.pendingOperations.filter(op => !op.synced);

    if (operationsToSync.length === 0) {
      return;
    }

    const cloudClient = this.dbConfig.getCloudClient();
    if (!cloudClient) {
      this.logger.error('Cloud client not available for sync');
      return;
    }

    for (const op of operationsToSync) {
      try {
        await this.executeCloudOperation(cloudClient, op);

        // Mark as synced
        op.synced = true;
        op.retryCount = 0;

        // Update local record sync status
        await this.updateLocalSyncStatus(op);

        this.logger.log(`Successfully synced to cloud: ${op.tableName} - ${op.operation}`);
      } catch (error) {
        op.retryCount++;
        this.logger.error(`Failed to sync to cloud: ${op.tableName} - ${op.operation}, retry ${op.retryCount}`);

        // Remove from pending if too many retries
        if (op.retryCount >= 3) {
          op.synced = true; // Mark as synced to stop retrying
          this.logger.error(`Max retries reached for operation: ${op.id}`);
        }
      }
    }

    // Clean up synced operations
    this.pendingOperations = this.pendingOperations.filter(op => !op.synced);
  }

  private async executeCloudOperation(cloudClient: any, operation: OfflineOperation): Promise<any> {
    const model = this.getModelFromTableName(cloudClient, operation.tableName);
    const whereClause = this.getWhereClause(operation.tableName, operation.data);

    switch (operation.operation) {
      case 'create':
        return await model.create({ data: operation.data });

      case 'update':
        const { id: _, ...updateData } = operation.data;
        return await model.update({
          where: whereClause,
          data: updateData
        });

      case 'delete':
        return await model.update({
          where: whereClause,
          data: { is_deleted: true }
        });

      default:
        throw new Error(`Unknown operation: ${operation.operation}`);
    }
  }

  private async updateLocalSyncStatus(operation: OfflineOperation): Promise<void> {
    const localClient = this.dbConfig.getLocalClient();
    if (!localClient) return;

    // Tables that have sync_status field
    const tablesWithSyncStatus = [
      'Finance', 'StudentFees', 'FeePayments', 'StaffAttendance',
      'StudentAttendance', 'LeaveRequest', 'Homework', 'Classes',
      'School', 'Holidays', 'Feedback', 'Tickets', 'ExamMarks',
      'ExamTimeTable', 'FeeStructure', 'BusFeeStructure', 'BusFeePayment',
      'RteStructure', 'RteFeePayment', 'ImageAndVideos', 'ClassTimetable',
      'AppPayment', 'BlockedSchool', 'RealTimeMessage', 'Attendance_user'
    ];

    const hasSyncStatus = tablesWithSyncStatus.includes(operation.tableName);

    // Only update sync_status if the table has this field
    if (hasSyncStatus) {
      const model = this.getModelFromTableName(localClient, operation.tableName);
      const whereClause = this.getWhereClause(operation.tableName, operation.data);

      try {
        await model.update({
          where: whereClause,
          data: { sync_status: 'synced', updated_at: new Date() }
        });
      } catch (error) {
        this.logger.error(`Failed to update local sync status for ${operation.tableName}: ${error.message}`);
      }
    }
  }

  // Start periodic sync for desktop users
  private startPeriodicSync(): void {
    if (!this.isDesktopOfflineMode()) return;

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        await this.syncToCloud();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Check connectivity to cloud
  async checkConnectivity(): Promise<void> {
    try {
      const syncStatus = this.dbConfig.getSyncStatus();
      this.isOnline = syncStatus.isCloudOnline;
      if (!this.isOnline) {
        this.logger.warn('Cloud connection lost or offline mode active');
      }
    } catch (error) {
      this.isOnline = false;
      this.logger.warn('Cloud connection check failed, working in offline mode');
    }
  }

  // Force sync all pending operations
  async forceSyncAll(): Promise<{ success: number; failed: number }> {
    const initialCount = this.pendingOperations.length;
    await this.syncToCloud();

    const successCount = initialCount - this.pendingOperations.length;
    const failedCount = this.pendingOperations.filter(op => op.retryCount >= 3).length;

    return { success: successCount, failed: failedCount };
  }

  // Get offline status
  getOfflineStatus(): {
    isDesktopMode: boolean;
    isOnline: boolean;
    pendingOperations: number;
    pendingOperationsList: OfflineOperation[];
  } {
    return {
      isDesktopMode: this.isDesktopOfflineMode(),
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      pendingOperationsList: [...this.pendingOperations],
    };
  }

  // Clear synced operations
  clearSyncedOperations(): void {
    this.pendingOperations = this.pendingOperations.filter(op => !op.synced);
  }

  // Queue an operation for cloud sync (after it's already been saved locally)
  async queueForCloudSync(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<void> {
    const offlineOp: OfflineOperation = {
      id: this.generateOperationId(),
      tableName,
      operation,
      data,
      timestamp: new Date(),
      synced: false,
      retryCount: 0,
    };

    this.pendingOperations.push(offlineOp);
    this.logger.log(`Queued for cloud sync: ${tableName} - ${operation}`);

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.syncToCloud(offlineOp);
    }
  }

  public generateOperationId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
