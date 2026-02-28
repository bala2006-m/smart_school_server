import { Injectable, Logger } from '@nestjs/common';
import { DatabaseConfigService } from '../database/database.config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SimpleInitialSyncService {
  private readonly logger = new Logger(SimpleInitialSyncService.name);

  constructor(private readonly dbConfig: DatabaseConfigService) { }

  private async shouldSkipSync(tableName: string, schoolId: number, cloudClient: any, localClient: any): Promise<boolean> {
    try {
      let cloudCount, localCount;

      switch (tableName) {
        case 'school':
          cloudCount = await cloudClient.school.count({ where: { id: schoolId } });
          localCount = await localClient.school.count({ where: { id: schoolId } });
          break;

        case 'blockedSchool':
          cloudCount = await cloudClient.blockedSchool.count({ where: { school_id: schoolId } });
          localCount = await localClient.blockedSchool.count({ where: { school_id: schoolId } });
          break;

        case 'studentAttendance':
          cloudCount = await cloudClient.studentAttendance.count({
            where: {
              school_id: schoolId,
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          });
          localCount = await localClient.studentAttendance.count({
            where: {
              school_id: schoolId,
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          });
          break;

        case 'staffAttendance':
          cloudCount = await cloudClient.staffAttendance.count({
            where: {
              school_id: schoolId,
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          });
          localCount = await localClient.staffAttendance.count({
            where: {
              school_id: schoolId,
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          });
          break;

        case 'staff':
          cloudCount = await cloudClient.staff.count({ where: { school_id: schoolId } });
          localCount = await localClient.staff.count({ where: { school_id: schoolId } });
          break;

        case 'student':
          cloudCount = await cloudClient.student.count({ where: { school_id: schoolId } });
          localCount = await localClient.student.count({ where: { school_id: schoolId } });
          break;

        case 'classes':
          cloudCount = await cloudClient.classes.count({ where: { school_id: schoolId } });
          localCount = await localClient.classes.count({ where: { school_id: schoolId } });
          break;

        case 'admin':
          cloudCount = await cloudClient.admin.count({ where: { school_id: schoolId } });
          localCount = await localClient.admin.count({ where: { school_id: schoolId } });
          break;

        case 'attendance_user':
          cloudCount = await cloudClient.attendance_user.count({ where: { school_id: schoolId } });
          localCount = await localClient.attendance_user.count({ where: { school_id: schoolId } });
          break;

        case 'feestructure':
          cloudCount = await cloudClient.feeStructure.count({ where: { school_id: schoolId } });
          localCount = await localClient.feeStructure.count({ where: { school_id: schoolId } });
          break;

        case 'busfeestructure':
          cloudCount = await cloudClient.busFeeStructure.count({ where: { school_id: schoolId } });
          localCount = await localClient.busFeeStructure.count({ where: { school_id: schoolId } });
          break;

        case 'rtestructure':
          cloudCount = await cloudClient.rteStructure.count({ where: { school_id: schoolId } });
          localCount = await localClient.rteStructure.count({ where: { school_id: schoolId } });
          break;

        case 'holidays':
          cloudCount = await cloudClient.holidays.count({ where: { school_id: schoolId } });
          localCount = await localClient.holidays.count({ where: { school_id: schoolId } });
          break;

        case 'homework':
          cloudCount = await cloudClient.homework.count({ where: { school_id: schoolId } });
          localCount = await localClient.homework.count({ where: { school_id: schoolId } });
          break;

        case 'imageandvideos':
          cloudCount = await cloudClient.imageAndVideos.count({ where: { school_id: schoolId } });
          localCount = await localClient.imageAndVideos.count({ where: { school_id: schoolId } });
          break;

        case 'leaverequest':
          cloudCount = await cloudClient.leaveRequest.count({ where: { school_id: schoolId } });
          localCount = await localClient.leaveRequest.count({ where: { school_id: schoolId } });
          break;

        case 'tickets':
          cloudCount = await cloudClient.tickets.count({ where: { school_id: schoolId } });
          localCount = await localClient.tickets.count({ where: { school_id: schoolId } });
          break;

        case 'studentfees':
          cloudCount = await cloudClient.studentFees.count({ where: { school_id: schoolId } });
          localCount = await localClient.studentFees.count({ where: { school_id: schoolId } });
          break;

        case 'feepayments':
          cloudCount = await cloudClient.feePayments.count({
            where: {
              studentFee: {
                school_id: schoolId
              }
            }
          });
          localCount = await localClient.feePayments.count({
            where: {
              studentFee: {
                school_id: schoolId
              }
            }
          });
          break;

        case 'busfeepayment':
          cloudCount = await cloudClient.busFeePayment.count({ where: { school_id: schoolId } });
          localCount = await localClient.busFeePayment.count({ where: { school_id: schoolId } });
          break;

        case 'rtefeepayment':
          cloudCount = await cloudClient.rteFeePayment.count({ where: { school_id: schoolId } });
          localCount = await localClient.rteFeePayment.count({ where: { school_id: schoolId } });
          break;

        case 'exammarks':
          cloudCount = await cloudClient.examMarks.count({ where: { school_id: schoolId } });
          localCount = await localClient.examMarks.count({ where: { school_id: schoolId } });
          break;

        case 'finance':
          cloudCount = await cloudClient.finance.count({ where: { school_id: schoolId } });
          localCount = await localClient.finance.count({ where: { school_id: schoolId } });
          break;

        case 'messages':
          cloudCount = await cloudClient.messages.count({ where: { school_id: schoolId } });
          localCount = await localClient.messages.count({ where: { school_id: schoolId } });
          break;

        default:
          return false;
      }

      const shouldSkip = cloudCount === localCount;
      if (shouldSkip) {
        this.logger.log(`⏭️ Skipping ${tableName} sync - counts match: ${cloudCount} records`);
      } else {
        this.logger.log(`🔄 Syncing ${tableName} - cloud: ${cloudCount}, local: ${localCount}`);
      }

      return shouldSkip;
    } catch (error) {
      this.logger.error(`Count comparison failed for ${tableName}: ${error.message}`);
      return false; // Proceed with sync if count check fails
    }
  }

  async performSimpleInitialSync(schoolId: number): Promise<{ success: boolean; synced: any }> {
    if (!this.dbConfig.isHybridMode()) {
      this.logger.warn('Not in hybrid mode, skipping initial sync');
      return { success: false, synced: null };
    }

    this.logger.log(`Starting SIMPLE initial sync for school ${schoolId}`);

    const cloudClient = this.dbConfig.getCloudClient();
    const localClient = this.dbConfig.getLocalClient();

    // For desktop users, check if all tables are already in sync
    const tablesToCheck: string[] = [
      'school', 'blockedSchool', 'attendance_user', 'admin', 'classes', 'staff', 'students',
      'feestructure', 'busfeestructure', 'rtestructure', 'classtimetable',
      'examtimetable', 'holidays', 'studentattendance', 'staffattendance',
      'homework', 'imageandvideos', 'leaverequest', 'tickets',
      'studentfees', 'feepayments', 'busfeepayment', 'rtefeepayment',
      'exammarks', 'finance', 'messages'
    ];

    let allTablesInSync = true;
    const skippedTables: string[] = [];
    const syncedTables: string[] = [];

    for (const tableName of tablesToCheck) {
      const shouldSkip = await this.shouldSkipSync(tableName, schoolId, cloudClient, localClient);
      if (shouldSkip) {
        skippedTables.push(tableName);
      } else {
        allTablesInSync = false;
        syncedTables.push(tableName);
      }
    }

    if (allTablesInSync) {
      this.logger.log(`🎉 All tables already in sync - skipping initial sync completely!`);
      return {
        success: true,
        synced: {
          ...Object.fromEntries(tablesToCheck.map(table => [table, 0])),
          total: 0,
          skipped: tablesToCheck,
          message: 'All tables already in sync'
        }
      };
    }

    this.logger.log(`🔄 Syncing tables: ${syncedTables.join(', ')}`);
    this.logger.log(`⏭️ Skipping tables: ${skippedTables.join(', ')}`);

    const syncResults = {
      school: 0,
      blockedSchool: 0,
      attendance_user: 0,
      admin: 0,
      classes: 0,
      staff: 0,
      students: 0,
      feestructure: 0,
      busfeestructure: 0,
      rtestructure: 0,
      classtimetable: 0,
      examtimetable: 0,
      holidays: 0,
      studentattendance: 0,
      staffattendance: 0,
      homework: 0,
      imageandvideos: 0,
      leaverequest: 0,
      tickets: 0,
      studentfees: 0,
      feepayments: 0,
      busfeepayment: 0,
      rtefeepayment: 0,
      exammarks: 0,
      finance: 0,
      messages: 0,
      total: 0,
    };

    try {
      // Sync in dependency order: root to leaves
      // 1. School (root)
      await this.syncSchool(schoolId, cloudClient, localClient, syncResults);

      // 2. Blocked Schools
      await this.syncBlockedSchool(schoolId, cloudClient, localClient, syncResults);

      // 3. Attendance Users (next level - users that other tables depend on)
      await this.syncAttendanceUsers(schoolId, cloudClient, localClient, syncResults);

      // 3. Admin (depends on attendance_user)
      await this.syncAdmin(schoolId, cloudClient, localClient, syncResults);

      // 4. Classes (independent, but needed for students/staff)
      await this.syncClasses(schoolId, cloudClient, localClient, syncResults);

      // 5. Staff (depends on attendance_user)
      await this.syncStaff(schoolId, cloudClient, localClient, syncResults);

      // 6. Students (depends on attendance_user and classes)
      await this.syncStudents(schoolId, cloudClient, localClient, syncResults);

      // 7. Fee Structures (depends on school)
      await this.syncFeeStructure(schoolId, cloudClient, localClient, syncResults);
      await this.syncBusFeeStructure(schoolId, cloudClient, localClient, syncResults);
      await this.syncRteStructure(schoolId, cloudClient, localClient, syncResults);

      // 8. Timetables (depends on classes and staff)
      await this.syncClassTimetable(schoolId, cloudClient, localClient, syncResults);
      await this.syncExamTimetable(schoolId, cloudClient, localClient, syncResults);

      // 9. Holidays (depends on school)
      await this.syncHolidays(schoolId, cloudClient, localClient, syncResults);

      // 10. Attendance Records (depends on students, staff, classes)
      await this.syncStudentAttendance(schoolId, cloudClient, localClient, syncResults);
      await this.syncStaffAttendance(schoolId, cloudClient, localClient, syncResults);

      // 11. Academic Content (depends on classes, students, staff)
      await this.syncHomework(schoolId, cloudClient, localClient, syncResults);
      await this.syncImageAndVideos(schoolId, cloudClient, localClient, syncResults);
      await this.syncLeaveRequest(schoolId, cloudClient, localClient, syncResults);
      await this.syncTickets(schoolId, cloudClient, localClient, syncResults);

      // 12. Finance Records (depends on students, fee structures)
      await this.syncStudentFees(schoolId, cloudClient, localClient, syncResults);
      await this.syncFeePayments(schoolId, cloudClient, localClient, syncResults);
      await this.syncBusFeePayment(schoolId, cloudClient, localClient, syncResults);
      await this.syncRteFeePayment(schoolId, cloudClient, localClient, syncResults);

      // 13. Academic Results (depends on students, classes, exams)
      await this.syncExamMarks(schoolId, cloudClient, localClient, syncResults);

      // 14. Finance (depends on school)
      await this.syncFinance(schoolId, cloudClient, localClient, syncResults);

      // 15. Messages (depends on attendance_user)
      await this.syncMessages(schoolId, cloudClient, localClient, syncResults);

      syncResults.total = Object.values(syncResults).reduce((sum, count) => sum + count, 0) - syncResults.total;
      this.logger.log(`🎉 SIMPLE initial sync completed: ${syncResults.total} total records synced`);

      return { success: true, synced: syncResults };

    } catch (error) {
      this.logger.error(`Simple initial sync failed: ${error.message}`);
      return { success: false, synced: null };
    }
  }

  async syncSchool(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const schoolData = await cloudClient.school.findUnique({
        where: { id: schoolId }
      });

      if (schoolData) {
        await localClient.school.upsert({
          where: { id: schoolId },
          update: schoolData as any,
          create: schoolData as any
        });
        syncResults.school = 1;
        this.logger.log(`✅ School data synced (upserted)`);
      }
    } catch (error) {
      this.logger.error(`School sync failed: ${error.message}`);
    }
  }


  async syncBlockedSchool(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.blockedSchool.findMany({
        where: { school_id: schoolId }
      });

      for (const item of cloudData) {
        await localClient.blockedSchool.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
      }
      syncResults.blockedSchool = cloudData.length;
      this.logger.log(`✅ BlockedSchool data synced: ${cloudData.length}`);
    } catch (error) {
      this.logger.error(`BlockedSchool sync failed: ${error.message}`);
    }
  }

  async syncAdmin(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudAdmin = await cloudClient.admin.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      let syncedAdmin = 0;
      for (const admin of cloudAdmin) {
        try {
          await localClient.admin.upsert({
            where: { id: admin.id },
            update: admin as any,
            create: admin as any
          });
          syncedAdmin++;
        } catch (error) {
          this.logger.error(`Admin ${admin.id} sync failed: ${error.message}`);
        }
      }
      syncResults.admin = syncedAdmin;
      this.logger.log(`✅ Admin synced: ${syncedAdmin}`);
    } catch (error) {
      this.logger.error(`Admin sync failed: ${error.message}`);
    }
  }

  async syncClasses(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.classes.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.classes.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.classes.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`Class ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            // Find local record for status check
            const localRecord = localData.find(item => item.id === localId);
            if (localRecord && (localRecord as any).sync_status === 'pending') {
              this.logger.log(`⏭️ Skipping deletion of class ${localId} - sync_status is pending`);
              continue;
            }

            await localClient.classes.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted class ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete class ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.classes = syncedCount;
      this.logger.log(`✅ Classes synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Classes sync failed: ${error.message}`);
    }
  }

  async syncStaff(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const shouldSkip = await this.shouldSkipSync('staff', schoolId, cloudClient, localClient);
      if (shouldSkip) {
        return;
      }

      const cloudStaff = await cloudClient.staff.findMany({
        where: { school_id: schoolId },
        take: 100,
        orderBy: { id: 'asc' }
      });

      let syncedStaff = 0;
      for (const staff of cloudStaff) {
        try {
          const existingUser = await localClient.attendance_user.findUnique({
            where: {
              username_school_id: {
                username: staff.username,
                school_id: schoolId
              }
            }
          });

          if (existingUser) {
            await localClient.staff.upsert({
              where: { id: staff.id },
              update: staff as any,
              create: staff as any
            });
            syncedStaff++;
          } else {
            this.logger.warn(`Skipping staff ${staff.id} - user ${staff.username} not found in attendance_user table`);
          }
        } catch (error) {
          this.logger.error(`Staff ${staff.id} sync failed: ${error.message}`);
        }
      }
      syncResults.staff = syncedStaff;
      this.logger.log(`✅ Staff synced: ${syncedStaff}`);
    } catch (error) {
      this.logger.error(`Staff sync failed: ${error.message}`);
    }
  }

  async syncStudents(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const shouldSkip = await this.shouldSkipSync('student', schoolId, cloudClient, localClient);
      if (shouldSkip) {
        return;
      }

      const cloudStudents = await cloudClient.student.findMany({
        where: { school_id: schoolId },
        take: 200,
        orderBy: { id: 'asc' }
      });

      let syncedStudents = 0;
      for (const student of cloudStudents) {
        try {
          const existingUser = await localClient.attendance_user.findUnique({
            where: {
              username_school_id: {
                username: student.username,
                school_id: schoolId
              }
            }
          });

          if (existingUser) {
            await localClient.student.upsert({
              where: { id: student.id },
              update: student as any,
              create: student as any
            });
            syncedStudents++;
          } else {
            this.logger.warn(`Skipping student ${student.id} - user ${student.username} not found in attendance_user table`);
          }
        } catch (error) {
          this.logger.error(`Student ${student.id} sync failed: ${error.message}`);
        }
      }
      syncResults.students = syncedStudents;
      this.logger.log(`✅ Students synced: ${syncedStudents}`);
    } catch (error) {
      this.logger.error(`Students sync failed: ${error.message}`);
    }
  }

  async syncMessages(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.messages.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.messages.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.messages.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`Message ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            // NOTE: Messages table might not have sync_status in schema, but we check anyway if provided
            const localRecord = localData.find(item => item.id === localId);
            if (localRecord && (localRecord as any).sync_status === 'pending') {
              this.logger.log(`⏭️ Skipping deletion of message ${localId} - sync_status is pending`);
              continue;
            }

            await localClient.messages.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted message ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete message ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.messages = syncedCount;
      this.logger.log(`✅ Messages synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Messages sync failed: ${error.message}`);
    }
  }

  // Fee Structure sync methods
  async syncFeeStructure(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.feeStructure.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      let syncedCount = 0;
      for (const item of cloudData) {
        try {
          await localClient.feeStructure.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`FeeStructure ${item.id} sync failed: ${error.message}`);
        }
      }
      syncResults.feestructure = syncedCount;
      this.logger.log(`✅ FeeStructure synced: ${syncedCount}`);
    } catch (error) {
      this.logger.error(`FeeStructure sync failed: ${error.message}`);
    }
  }

  async syncBusFeeStructure(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.busFeeStructure.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      let syncedCount = 0;
      for (const item of cloudData) {
        try {
          await localClient.busFeeStructure.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`BusFeeStructure ${item.id} sync failed: ${error.message}`);
        }
      }
      syncResults.busfeestructure = syncedCount;
      this.logger.log(`✅ BusFeeStructure synced: ${syncedCount}`);
    } catch (error) {
      this.logger.error(`BusFeeStructure sync failed: ${error.message}`);
    }
  }

  async syncRteStructure(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.rteStructure.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      let syncedCount = 0;
      for (const item of cloudData) {
        try {
          await localClient.rteStructure.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`RteStructure ${item.id} sync failed: ${error.message}`);
        }
      }
      syncResults.rtestructure = syncedCount;
      this.logger.log(`✅ RteStructure synced: ${syncedCount}`);
    } catch (error) {
      this.logger.error(`RteStructure sync failed: ${error.message}`);
    }
  }

  // Timetable sync methods
  async syncClassTimetable(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.classTimetable.findMany({
        where: { schoolId: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.classTimetable.findMany({
        where: { schoolId: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.classTimetable.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`ClassTimetable ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.classTimetable.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted classTimetable ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete classTimetable ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.classtimetable = syncedCount;
      this.logger.log(`✅ ClassTimetable synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`ClassTimetable sync failed: ${error.message}`);
    }
  }

  async syncExamTimetable(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const shouldSkip = await this.shouldSkipSync('examtimetable', schoolId, cloudClient, localClient);
      if (shouldSkip) {
        return;
      }

      const cloudData = await cloudClient.examTimeTable.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.examTimeTable.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.examTimeTable.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`ExamTimetable ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.examTimeTable.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted examTimetable ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete examTimetable ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.examtimetable = syncedCount;
      this.logger.log(`✅ ExamTimetable synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`ExamTimetable sync failed: ${error.message}`);
    }
  }

  // Holiday sync
  async syncHolidays(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.holidays.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.holidays.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.holidays.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`Holiday ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.holidays.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted holiday ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete holiday ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.holidays = syncedCount;
      this.logger.log(`✅ Holidays synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Holidays sync failed: ${error.message}`);
    }
  }

  // Attendance sync methods
  async syncStudentAttendance(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const shouldSkip = await this.shouldSkipSync('studentAttendance', schoolId, cloudClient, localClient);
      if (shouldSkip) {
        return;
      }

      let syncedCount = 0;
      let deletedCount = 0;
      let skip = 0;
      const batchSize = 1000;
      let hasMoreData = true;

      // Calculate date filters
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      this.logger.log(`📅 Syncing student attendance from ${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);

      // Get all local records for comparison (only last 30 days)
      const localData = await localClient.studentAttendance.findMany({
        where: {
          school_id: schoolId,
          date: {
            gte: thirtyDaysAgo
          }
        }
      });
      const localIds = new Set(localData.map(item => `${item.username}_${item.date.toISOString().split('T')[0]}`));

      // Process in batches to handle large datasets
      while (hasMoreData) {
        const cloudData = await cloudClient.studentAttendance.findMany({
          where: {
            school_id: schoolId,
            date: {
              gte: thirtyDaysAgo,
              lte: today
            }
          },
          take: batchSize,
          skip: skip,
          orderBy: { date: 'asc' }
        });

        if (cloudData.length === 0) {
          hasMoreData = false;
          break;
        }

        // Process batch
        for (const item of cloudData) {
          try {
            // Skip records older than 1 year (additional safety check)
            if (item.date < oneYearAgo) {
              continue;
            }

            // Check if student exists before inserting attendance record
            const studentExists = await localClient.student.findUnique({
              where: {
                username_school_id: {
                  username: item.username,
                  school_id: item.school_id
                }
              }
            });

            if (studentExists) {
              await localClient.studentAttendance.upsert({
                where: {
                  username_school_date: {
                    username: item.username,
                    school_id: item.school_id,
                    date: item.date
                  }
                },
                update: item as any,
                create: item as any
              });
              syncedCount++;
              localIds.delete(`${item.username}_${item.date.toISOString().split('T')[0]}`);
            } else {
              this.logger.warn(`Skipping attendance for non-existent student: ${item.username}`);
            }
          } catch (error) {
            this.logger.error(`StudentAttendance ${item.username}_${item.date} sync failed: ${error.message}`);
          }
        }

        skip += batchSize;
        this.logger.log(`📊 Processed ${skip + cloudData.length} student attendance records...`);
      }

      // Delete local records not found in cloud (only last 30 days)
      for (const localId of localIds) {
        try {
          const idString = localId as string;
          const [username, school_id, date] = idString.split('_');

          // Find local record for status check
          const localRecord = localData.find(item => `${item.username}_${item.date.toISOString().split('T')[0]}` === localId);
          if (localRecord && (localRecord as any).sync_status === 'pending') {
            this.logger.log(`⏭️ Skipping deletion of StudentAttendance ${idString} - sync_status is pending`);
            continue;
          }

          await localClient.studentAttendance.delete({
            where: {
              username_school_date: {
                username: username,
                school_id: parseInt(school_id),
                date: new Date(date)
              }
            }
          });
          deletedCount++;
          this.logger.log(`🗑️ Deleted StudentAttendance ${idString} (not found in cloud)`);
        } catch (error) {
          this.logger.error(`Failed to delete StudentAttendance ${localId}: ${error.message}`);
        }
      }

      this.logger.log(`✅ StudentAttendance synced: ${syncedCount} upserted, ${deletedCount} deleted (Last 30 days only)`);
    } catch (error) {
      this.logger.error(`StudentAttendance sync failed: ${error.message}`);
    }
  }

  async syncStaffAttendance(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const shouldSkip = await this.shouldSkipSync('staffAttendance', schoolId, cloudClient, localClient);
      if (shouldSkip) {
        return;
      }

      // Calculate date filters
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      this.logger.log(`📅 Syncing staff attendance from ${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);

      // Get cloud data (only last 30 days)
      const cloudData = await cloudClient.staffAttendance.findMany({
        where: {
          school_id: schoolId,
          date: {
            gte: thirtyDaysAgo,
            lte: today
          }
        },
        take: 200,
        orderBy: { date: 'asc' }
      });

      // Get local records for comparison (only last 30 days)
      const localData = await localClient.staffAttendance.findMany({
        where: {
          school_id: schoolId,
          date: {
            gte: thirtyDaysAgo
          }
        }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          // Skip records older than 1 year (additional safety check)
          if (item.date < oneYearAgo) {
            continue;
          }

          // Check if staff exists before inserting attendance record
          const staffExists = await localClient.staff.findUnique({
            where: {
              username_school_id: {
                username: item.username,
                school_id: item.school_id
              }
            }
          });

          if (staffExists) {
            await localClient.staffAttendance.upsert({
              where: { id: item.id },
              update: item as any,
              create: item as any
            });
            syncedCount++;
            localIds.delete(item.id);
          } else {
            this.logger.warn(`Skipping attendance for non-existent staff: ${item.username}`);
          }
        } catch (error) {
          this.logger.error(`StaffAttendance ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records not found in cloud (only last 30 days)
      for (const localId of localIds) {
        try {
          if (localId) {
            // Find local record for status check
            const localRecord = localData.find(item => item.id === localId);
            if (localRecord && (localRecord as any).sync_status === 'pending') {
              this.logger.log(`⏭️ Skipping deletion of StaffAttendance ${localId} - sync_status is pending`);
              continue;
            }

            await localClient.staffAttendance.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted StaffAttendance ${localId} (not found in cloud)`);
          }
        } catch (error) {
          this.logger.error(`Failed to delete StaffAttendance ${localId}: ${error.message}`);
        }
      }

      syncResults.staffattendance = syncedCount;
      this.logger.log(`✅ StaffAttendance synced: ${syncedCount} upserted, ${deletedCount} deleted (Last 30 days only)`);
    } catch (error) {
      this.logger.error(`StaffAttendance sync failed: ${error.message}`);
    }
  }

  async syncAttendanceUsers(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const attendanceTable = 'attendance_user';

      const cloudData = await cloudClient[attendanceTable].findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient[attendanceTable].findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient[attendanceTable].upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`Failed to upsert ${attendanceTable} row ${item.id}: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            const localRecord = localData.find(item => item.id === localId);
            if (localRecord) {
              await localClient[attendanceTable].delete({
                where: { id: localId }
              });
              deletedCount++;
              this.logger.log(`🗑️ Deleted ${attendanceTable} ${localId} (not found in cloud)`);
            }
          } catch (error) {
            this.logger.error(`Failed to delete ${attendanceTable} row ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.attendance_user = syncedCount;
      this.logger.log(`✅ Attendance Users synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Attendance Users sync failed: ${error.message}`);
    }
  }

  // Academic content sync methods
  async syncHomework(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.homework.findMany({
        where: { school_id: schoolId },
        take: 100,
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.homework.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.homework.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`Homework ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.homework.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted homework ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete homework ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.homework = syncedCount;
      this.logger.log(`✅ Homework synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`Homework sync failed: ${error.message}`);
    }
  }

  async syncImageAndVideos(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.imageAndVideos.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.imageAndVideos.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.imageAndVideos.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`ImageAndVideos ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.imageAndVideos.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted ImageAndVideos ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete ImageAndVideos ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.imageandvideos = syncedCount;
      this.logger.log(`✅ ImageAndVideos synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`ImageAndVideos sync failed: ${error.message}`);
    }
  }

  async syncLeaveRequest(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.leaveRequest.findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get all local records for this school
      const localData = await localClient.leaveRequest.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.leaveRequest.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`LeaveRequest ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.leaveRequest.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted LeaveRequest ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete LeaveRequest ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.leaverequest = syncedCount;
      this.logger.log(`✅ LeaveRequest synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`LeaveRequest sync failed: ${error.message}`);
    }
  }

  // Helper method for deletion-aware sync
  private async syncTableWithDeletion(
    tableName: string,
    schoolId: number,
    cloudClient: any,
    localClient: any,
    syncResults: any,
    resultKey: string
  ): Promise<void> {
    try {
      // Get cloud data
      const cloudData = await cloudClient[tableName].findMany({
        where: { school_id: schoolId },
        orderBy: { id: 'asc' }
      });

      // Get local data
      const localData = await localClient[tableName].findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          // Check if this is a payment table that requires student validation
          const isPaymentTable = ['busFeePayment', 'rteFeePayment', 'studentFees', 'feePayments'].includes(tableName);

          if (isPaymentTable && item.student_id) {
            // Check if student exists before inserting payment record
            const studentExists = await localClient.student.findUnique({
              where: {
                username_school_id: {
                  username: item.student_id.toString(),
                  school_id: item.school_id
                }
              }
            });

            if (!studentExists) {
              this.logger.warn(`Skipping ${tableName} for non-existent student: ${item.student_id}`);
              continue;
            }
          }

          await localClient[tableName].upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`${tableName} ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            // Fetch local record to check sync_status
            const localRecord = localData.find(item => item.id === localId);
            if (localRecord && (localRecord as any).sync_status === 'pending') {
              this.logger.log(`⏭️ Skipping deletion of ${tableName} ${localId} - sync_status is pending`);
              continue;
            }

            await localClient[tableName].delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted ${tableName} ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete ${tableName} ${localId}: ${error.message}`);
          }
        }
      }

      syncResults[resultKey] = syncedCount;
      this.logger.log(`✅ ${tableName} synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`${tableName} sync failed: ${error.message}`);
    }
  }

  async syncTickets(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    await this.syncTableWithDeletion('tickets', schoolId, cloudClient, localClient, syncResults, 'tickets');
  }

  async syncStudentFees(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      const cloudData = await cloudClient.studentFees.findMany({
        where: { school_id: schoolId },
        orderBy: { aId: 'asc' }
      });

      // Get local data
      const localData = await localClient.studentFees.findMany({
        where: { school_id: schoolId }
      });

      // Create sets for comparison (using aId as primary key)
      const cloudIds = new Set(cloudData.map(item => item.aId));
      const localIds = new Set(localData.map(item => item.aId));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.studentFees.upsert({
            where: { aId: item.aId },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`StudentFees ${item.aId} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.studentFees.delete({
              where: { aId: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted StudentFees ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete StudentFees ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.studentfees = syncedCount;
      this.logger.log(`✅ StudentFees synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`StudentFees sync failed: ${error.message}`);
    }
  }

  async syncFeePayments(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    try {
      // FeePayments doesn't have school_id, so we need to query through StudentFees relationship
      const cloudData = await cloudClient.feePayments.findMany({
        where: {
          studentFee: {
            school_id: schoolId
          }
        },
        orderBy: { id: 'asc' }
      });

      // Get local data through relationship
      const localData = await localClient.feePayments.findMany({
        where: {
          studentFee: {
            school_id: schoolId
          }
        }
      });

      // Create sets for comparison
      const cloudIds = new Set(cloudData.map(item => item.id));
      const localIds = new Set(localData.map(item => item.id));

      let syncedCount = 0;
      let deletedCount = 0;

      // Upsert cloud records to local
      for (const item of cloudData) {
        try {
          await localClient.feePayments.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          syncedCount++;
        } catch (error) {
          this.logger.error(`FeePayments ${item.id} sync failed: ${error.message}`);
        }
      }

      // Delete local records that don't exist in cloud
      for (const localId of localIds) {
        if (!cloudIds.has(localId)) {
          try {
            await localClient.feePayments.delete({
              where: { id: localId }
            });
            deletedCount++;
            this.logger.log(`🗑️ Deleted FeePayments ${localId} (not found in cloud)`);
          } catch (error) {
            this.logger.error(`Failed to delete FeePayments ${localId}: ${error.message}`);
          }
        }
      }

      syncResults.feepayments = syncedCount;
      this.logger.log(`✅ FeePayments synced: ${syncedCount} upserted, ${deletedCount} deleted`);
    } catch (error) {
      this.logger.error(`FeePayments sync failed: ${error.message}`);
    }
  }

  async syncBusFeePayment(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    await this.syncTableWithDeletion('busFeePayment', schoolId, cloudClient, localClient, syncResults, 'busfeepayment');
  }

  async syncRteFeePayment(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    await this.syncTableWithDeletion('rteFeePayment', schoolId, cloudClient, localClient, syncResults, 'rtefeepayment');
  }

  async syncExamMarks(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    await this.syncTableWithDeletion('examMarks', schoolId, cloudClient, localClient, syncResults, 'exammarks');
  }

  async syncFinance(schoolId: number, cloudClient: any, localClient: any, syncResults: any) {
    await this.syncTableWithDeletion('finance', schoolId, cloudClient, localClient, syncResults, 'finance');
  }

  getSyncStatus() {
    return {
      isHybridMode: this.dbConfig.isHybridMode(),
    };
  }
}
