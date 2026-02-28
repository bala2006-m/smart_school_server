import { Injectable, Logger } from '@nestjs/common';
import { DatabaseConfigService } from '../database/database.config';

@Injectable()
export class SchoolSyncService {
  private readonly logger = new Logger(SchoolSyncService.name);

  constructor(private readonly dbConfig: DatabaseConfigService) {}

  // Sync school data from cloud to local database
  async syncSchoolDataToLocal(schoolId: number): Promise<boolean> {
    try {
      const cloudClient = this.dbConfig.getCloudClient();
      const localClient = this.dbConfig.getLocalClient();

      if (!cloudClient || !localClient) {
        this.logger.warn('Both cloud and local clients required for school sync');
        return false;
      }

      // Get school data from cloud
      const schoolData = await cloudClient.school.findUnique({
        where: { id: schoolId },
      });

      if (!schoolData) {
        this.logger.warn(`School with ID ${schoolId} not found in cloud database`);
        return false;
      }

      // Check if school exists in local database
      const existingSchool = await localClient.school.findUnique({
        where: { id: schoolId },
      });

      if (existingSchool) {
        this.logger.log(`School ${schoolId} already exists in local database`);
        return true;
      }

      // Create school in local database with correct field names
      await localClient.school.create({
        data: {
          id: schoolData.id,
          name: schoolData.name,
          address: schoolData.address,
          photo: schoolData.photo,
          createdAt: schoolData.createdAt,
          dueDate: schoolData.dueDate,
          student_access: schoolData.student_access as any,
          updated_at: schoolData.updated_at,
          is_deleted: schoolData.is_deleted,
        },
      });

      this.logger.log(`Successfully synced school ${schoolId} to local database`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to sync school data: ${error.message}`);
      return false;
    }
  }

  // Check if school data exists locally
  async isSchoolDataAvailable(schoolId: number): Promise<boolean> {
    try {
      const localClient = this.dbConfig.getLocalClient();
      if (!localClient) return false;

      const school = await localClient.school.findUnique({
        where: { id: schoolId },
      });

      return school !== null;
    } catch (error) {
      return false;
    }
  }

  // Quick sync for essential data only
  async quickSyncSchool(schoolId: number): Promise<boolean> {
    this.logger.log(`Starting quick sync for school ${schoolId}`);
    
    try {
      const success = await this.syncSchoolDataToLocal(schoolId);
      
      if (success) {
        this.logger.log(`Quick sync completed successfully for school ${schoolId}`);
      } else {
        this.logger.warn(`Quick sync failed for school ${schoolId}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Quick sync failed for school ${schoolId}: ${error.message}`);
      return false;
    }
  }
}
