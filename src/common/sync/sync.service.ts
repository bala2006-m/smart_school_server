import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfigService } from '../database/database.config';

export interface SyncOperation {
  id: string;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  source: 'cloud' | 'local';
  status: 'pending' | 'completed' | 'failed';
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;

  constructor(private readonly dbConfig: DatabaseConfigService) {}

  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'status' | 'timestamp'>): Promise<void> {
    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateSyncId(),
      timestamp: new Date(),
      status: 'pending',
    };

    this.syncQueue.push(syncOperation);
    this.logger.log(`Added to sync queue: ${operation.tableName} - ${operation.operation}`);
    
    // Process queue asynchronously
    this.processSyncQueue();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        if (operation) {
          await this.processSyncOperation(operation);
        }
      }
    } catch (error) {
      this.logger.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    try {
      const { source, tableName, data, operation: opType } = operation;
      
      // Determine target client
      const targetClient = source === 'cloud' 
        ? this.dbConfig.getLocalClient()
        : this.dbConfig.getCloudClient();

      if (!targetClient) {
        this.logger.warn(`No target client available for sync operation: ${operation.id}`);
        return;
      }

      // Process operation based on table and operation type
      await this.executeOperation(targetClient, tableName, opType, data);
      
      operation.status = 'completed';
      this.logger.log(`Sync operation completed: ${operation.id}`);
    } catch (error) {
      operation.status = 'failed';
      this.logger.error(`Sync operation failed: ${operation.id}`, error);
    }
  }

  private async executeOperation(
    client: PrismaClient,
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<void> {
    const model = this.getModelFromTableName(client, tableName);
    
    switch (operation) {
      case 'create':
        await model.create({ data });
        break;
      case 'update':
        const { id, ...updateData } = data;
        await model.update({ where: { id }, data: updateData });
        break;
      case 'delete':
        await model.delete({ where: { id: data.id } });
        break;
    }
  }

  private getModelFromTableName(client: PrismaClient, tableName: string): any {
    // Map table names to Prisma models
    const modelMap: Record<string, any> = {
      'StudentAttendance': client.studentAttendance,
      'StaffAttendance': client.staffAttendance,
      'StudentFees': client.studentFees,
      'FeePayments': client.feePayments,
      'Finance': client.finance,
      'LeaveRequest': client.leaveRequest,
      'Homework': client.homework,
      'Student': client.student,
      'Staff': client.staff,
      'Admin': client.admin,
      'School': client.school,
      'Classes': client.classes,
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

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async syncAllData(): Promise<void> {
    if (!this.dbConfig.isHybridMode()) {
      this.logger.log('Not in hybrid mode, skipping full sync');
      return;
    }

    this.logger.log('Starting full data synchronization...');
    
    const tables = [
      'StudentAttendance', 'StaffAttendance', 'StudentFees', 'FeePayments',
      'Finance', 'LeaveRequest', 'Homework', 'Student', 'Staff', 'Admin',
      'School', 'Classes', 'Holidays', 'Messages', 'Feedback', 'Tickets',
      'ExamMarks', 'ExamTimeTable', 'FeeStructure', 'BusFeeStructure',
      'BusFeePayment', 'RteStructure', 'RteFeePayment', 'ImageAndVideos',
      'ClassTimetable', 'AppPayment', 'BlockedSchool', 'RealTimeMessage',
      'Attendance_user'
    ];

    for (const tableName of tables) {
      try {
        await this.syncTable(tableName);
      } catch (error) {
        this.logger.error(`Failed to sync table ${tableName}:`, error);
      }
    }

    this.logger.log('Full data synchronization completed');
  }

  private async syncTable(tableName: string): Promise<void> {
    const cloudClient = this.dbConfig.getCloudClient();
    const localClient = this.dbConfig.getLocalClient();

    if (!cloudClient || !localClient) {
      return;
    }

    const cloudModel = this.getModelFromTableName(cloudClient, tableName);
    const localModel = this.getModelFromTableName(localClient, tableName);

    // Get all records from cloud
    const cloudRecords = await cloudModel.findMany({
      where: { is_deleted: false }
    });

    // Get all records from local
    const localRecords = await localModel.findMany({
      where: { is_deleted: false }
    });

    // Sync logic - this is a simplified version
    // In production, you'd want more sophisticated conflict resolution
    for (const record of cloudRecords) {
      const localRecord = localRecords.find(lr => lr.id === record.id);
      
      if (!localRecord) {
        // Record exists in cloud but not local - create in local
        const { id, ...createData } = record;
        await localModel.create({ 
          data: { 
            ...createData, 
            sync_status: 'synced' 
          } 
        });
      } else if (new Date(record.updated_at) > new Date(localRecord.updated_at)) {
        // Cloud record is newer - update local
        const { id, ...updateData } = record;
        await localModel.update({ 
          where: { id }, 
          data: { 
            ...updateData, 
            sync_status: 'synced' 
          } 
        });
      }
    }
  }

  getSyncStatus(): { pending: number; completed: number; failed: number } {
    const pending = this.syncQueue.filter(op => op.status === 'pending').length;
    const completed = this.syncQueue.filter(op => op.status === 'completed').length;
    const failed = this.syncQueue.filter(op => op.status === 'failed').length;

    return { pending, completed, failed };
  }
}
