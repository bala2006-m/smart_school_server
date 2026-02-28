import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SimpleInitialSyncService } from './simple-initial-sync.service';
import { CloudToLocalSyncService } from './cloud-to-local.service';
import { DatabaseConfigService } from '../database/database.config';

@Injectable()
export class LoginSyncService implements OnModuleInit {
  private readonly logger = new Logger(LoginSyncService.name);
  private syncInProgress = new Map<number, boolean>(); // Track sync per school
  private periodicSyncIntervals = new Map<number, NodeJS.Timeout>();
  private activeSchools = new Set<number>(); // Track active schools
  private currentActiveSchool: number = 1; // Track currently active school for periodic sync

  constructor(
    private readonly simpleInitialSyncService: SimpleInitialSyncService,
    private readonly cloudToLocalSyncService: CloudToLocalSyncService,
    private readonly dbConfig: DatabaseConfigService,
  ) { }

  // Check if request is from mobile platform
  private isMobilePlatform(request: any): boolean {
    return this.dbConfig.isMobilePlatform(request);
  }

  // Auto-start periodic sync when module initializes
  async onModuleInit() {
    this.logger.log('🚀 LoginSyncService initializing...');

    // Wait a bit for database connections to be ready
    setTimeout(async () => {
      try {
        if (this.dbConfig.isHybridMode()) {
          this.logger.log('🔄 LoginSyncService ready for multi-school periodic sync');
          // Don't auto-start any school - wait for login to trigger
        } else {
          this.logger.log('⚠️ Hybrid mode not active, periodic sync not started');
        }
      } catch (error) {
        this.logger.error(`Failed to initialize LoginSyncService: ${error.message}`);
      }
    }, 3000); // Wait 3 seconds for services to initialize
  }

  // Trigger sync after successful login
  async triggerLoginSync(schoolId: number, userId?: string, request?: any): Promise<{ success: boolean; message: string; synced?: any }> {
    if (!this.dbConfig.isHybridMode()) {
      this.logger.log('Not in hybrid mode, skipping login sync');
      return { success: false, message: 'Not in hybrid mode' };
    }

    // Check if request is from mobile platform - block ALL sync for mobile users
    if (request && this.isMobilePlatform(request)) {
      this.logger.log(`📱 Mobile platform detected - BLOCKING ALL sync for school ${schoolId} (user: ${userId})`);
      return { success: false, message: 'Sync blocked for mobile users - offline mode only' };
    }

    // Check if sync is already in progress for this school
    if (this.syncInProgress.get(schoolId)) {
      this.logger.log(`Sync already in progress for school ${schoolId}`);
      return { success: false, message: 'Sync already in progress' };
    }

    this.logger.log(`🔐 User logged in - triggering sync for school ${schoolId} ${userId ? `(user: ${userId})` : ''}`);

    // Add school to active schools
    this.activeSchools.add(schoolId);

    // Switch periodic sync to this school
    this.switchPeriodicSyncToSchool(schoolId, request);

    // Mark sync as in progress
    this.syncInProgress.set(schoolId, true);

    try {
      // Check if online before performing initial and cloud-to-local sync
      const syncStatus = this.dbConfig.getSyncStatus();
      if (!syncStatus.isCloudOnline || !syncStatus.isHybridMode) {
        this.logger.warn(`⚠️ Offline mode active or local DB not found. Skipping initial cloud sync for school ${schoolId}. Modifications will be saved locally and synced when online.`);

        // 1. Start periodic sync for this specific school (it handles its own offline checks)
        this.logger.log(`🔄 Starting periodic sync interval for school ${schoolId}`);
        this.startPeriodicSyncForSchool(schoolId, request);

        return {
          success: true,
          message: `Offline mode active for school ${schoolId}. Sync is queued for when network is available.`,
          synced: { total: 0, message: "Offline mode active" }
        };
      }

      // 1. Perform initial sync
      this.logger.log(`🔄 Starting initial sync after login for school ${schoolId}`);
      const initialResult = await this.simpleInitialSyncService.performSimpleInitialSync(schoolId);

      if (initialResult.success) {
        this.logger.log(`✅ Initial sync completed: ${initialResult.synced.total} records synced`);
      } else {
        this.logger.warn(`⚠️ Initial sync failed, but continuing with periodic sync`);
      }

      // 2. Start periodic sync for this specific school
      this.logger.log(`🔄 Starting periodic sync for school ${schoolId}`);
      this.startPeriodicSyncForSchool(schoolId, request);

      // 3. Perform immediate cloud-to-local sync for latest data
      this.logger.log(`🔄 Starting immediate cloud-to-local sync for school ${schoolId}`);
      const cloudResult = await this.cloudToLocalSyncService.performFullCloudToLocalSync(schoolId);

      if (cloudResult.messages > 0) {
        this.logger.log(`✅ Immediate cloud-to-local sync completed: ${cloudResult.messages} messages synced`);
      }

      return {
        success: true,
        message: `Login sync completed for school ${schoolId}: ${initialResult.synced.total} records synced`,
        synced: initialResult.synced
      };
    } catch (error) {
      this.logger.error(`Login sync failed for school ${schoolId}: ${error.message}`);
      return {
        success: false,
        message: `Login sync failed: ${error.message}`
      };
    } finally {
      // Mark sync as completed
      this.syncInProgress.set(schoolId, false);
    }
  }

  // Handle user logout - stop periodic sync for that school
  async handleUserLogout(schoolId: number, userId?: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`🔓 DEBUG: handleUserLogout called with schoolId=${schoolId}, userId=${userId}`);

    // Stop periodic sync for this school FIRST
    this.logger.log(`🔓 DEBUG: Stopping periodic sync for school ${schoolId}`);
    this.stopPeriodicSyncForSchool(schoolId);

    // Remove school from active schools
    this.logger.log(`🔓 DEBUG: Removing school ${schoolId} from active schools`);
    this.activeSchools.delete(schoolId);

    // Clear current active school if it's the one being logged out
    if (this.currentActiveSchool === schoolId) {
      this.currentActiveSchool = 0;
      this.logger.log(`🛑 Cleared current active school ${schoolId}`);
    }

    // Only switch to next active school if there are other active schools
    // AND the current school wasn't the one being logged out
    if (this.currentActiveSchool === 0 && this.activeSchools.size > 0) {
      this.logger.log(`🔓 DEBUG: Switching to next active school`);
      this.switchToNextActiveSchool();
    } else {
      this.logger.log(`🛑 No periodic sync will be started - no active schools or current school cleared`);
    }

    this.logger.log(`🔓 DEBUG: Logout completed for school ${schoolId}`);

    return {
      success: true,
      message: `Logout handled for school ${schoolId}. Periodic sync stopped.`
    };
  }

  // Switch periodic sync to specific school
  private switchPeriodicSyncToSchool(schoolId: number, request?: any): void {
    // Stop all existing periodic syncs
    this.stopAllPeriodicSyncs();

    // Set new active school
    this.currentActiveSchool = schoolId;

    // Start periodic sync for new active school
    if (this.activeSchools.has(schoolId)) {
      this.logger.log(`🔄 Switching periodic sync to school ${schoolId}`);
      this.startPeriodicSyncForSchool(schoolId, request);
    } else {
      this.logger.log(`🛑 School ${schoolId} is not in active schools list`);
    }
  }

  // Switch to next available active school
  private switchToNextActiveSchool(): void {
    const activeSchoolsArray = Array.from(this.activeSchools);

    if (activeSchoolsArray.length === 0) {
      this.logger.log('⚠️ No active schools, stopping all periodic sync');
      this.currentActiveSchool = 0;
      return;
    }

    // If current active school is no longer active, switch to next available
    if (!this.activeSchools.has(this.currentActiveSchool)) {
      const nextSchool = activeSchoolsArray[0]; // Get first available school
      this.logger.log(`🔄 Auto-switching periodic sync to next active school: ${nextSchool}`);
      this.switchPeriodicSyncToSchool(nextSchool);
    } else {
      this.logger.log(`🔄 Keeping periodic sync on current school: ${this.currentActiveSchool}`);
    }
  }

  // Start periodic sync for specific school
  public startPeriodicSyncForSchool(schoolId: number, request?: any): void {
    // Check if request is from mobile platform - if so, don't start sync
    if (request && this.isMobilePlatform(request)) {
      this.logger.log(`� Mobile platform detected - NOT starting periodic sync for school ${schoolId}`);
      return;
    }

    this.logger.log(`🖥️ Desktop/Web platform detected - Starting periodic sync for school ${schoolId}`);

    // Stop existing periodic sync for this school
    this.stopPeriodicSyncForSchool(schoolId);

    let syncCount = 0;
    const interval = setInterval(async () => {
      syncCount++;
      this.logger.log(`🔄 Starting periodic sync #${syncCount} for school ${schoolId} at ${new Date().toISOString()}`);
      try {
        // Check if hybrid mode is still active
        const syncStatus = this.dbConfig.getSyncStatus();
        if (!syncStatus.isHybridMode) {
          this.logger.log('⚠️ Hybrid mode disabled, stopping periodic sync');
          clearInterval(interval);
          this.periodicSyncIntervals.delete(schoolId);
          return;
        }

        // Check if online
        if (!syncStatus.isCloudOnline) {
          this.logger.log(`⚠️ Offline mode - skipping periodic sync check for school ${schoolId} (sync #${syncCount})`);
          return;
        }

        // Perform lightweight sync check
        const result = await this.performLightweightSync(schoolId);

        if (result.hasChanges) {
          this.logger.log(`🔄 Periodic sync (school ${schoolId}): ${result.totalChanges} total changes detected and synced`);
        } else {
          this.logger.log(`🔄 Periodic sync (school ${schoolId}): No changes detected (sync #${syncCount})`);
        }
      } catch (error) {
        this.logger.error(`Periodic sync failed (school ${schoolId}): ${error.message}`);
        this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
        // Don't stop interval on error, just log it
      }
    }, 30000); // 30 seconds - increased from 5 seconds to prevent database overload

    this.periodicSyncIntervals.set(schoolId, interval);
    console.log(`🔓 DEBUG: SET interval for school ${schoolId}. Total intervals now:`, Array.from(this.periodicSyncIntervals.keys()));
    this.logger.log(`✅ Periodic sync interval started for school ${schoolId}`);
  }

  // Lightweight sync method for periodic checks
  private async performLightweightSync(schoolId: number): Promise<{ hasChanges: boolean; totalChanges: number }> {
    try {
      // Track if this is the first sync for this school
      const isFirstSync = !this.lastSyncTimestamps.has(schoolId);

      if (isFirstSync) {
        this.logger.log(`🔄 First periodic sync for school ${schoolId} - performing full sync`);
        // First sync: perform full sync
        const result = await this.simpleInitialSyncService.performSimpleInitialSync(schoolId);
        this.lastSyncTimestamps.set(schoolId, new Date());
        return {
          hasChanges: result.success && result.synced.total > 0,
          totalChanges: result.synced.total || 0
        };
      } else {
        // Subsequent syncs: only sync updated rows
        this.logger.log(`🔄 Incremental periodic sync for school ${schoolId} - syncing updated rows only`);
        const lastSyncTime = this.lastSyncTimestamps.get(schoolId)!;
        this.logger.log(`🔄 Last sync time: ${lastSyncTime.toISOString()}`);
        const result = await this.performIncrementalSync(schoolId, lastSyncTime);
        this.logger.log(`🔄 Updating last sync time to: ${new Date().toISOString()}`);
        this.lastSyncTimestamps.set(schoolId, new Date());
        return result;
      }
    } catch (error) {
      this.logger.error(`Lightweight sync failed: ${error.message}`);
      return { hasChanges: false, totalChanges: 0 };
    }
  }

  // Track last sync timestamps for each school
  private lastSyncTimestamps = new Map<number, Date>();

  // Perform incremental sync for tables with updated_at field
  private async performIncrementalSync(schoolId: number, lastSyncTime: Date): Promise<{ hasChanges: boolean; totalChanges: number }> {
    try {
      this.logger.log(`🔍 DEBUG: performIncrementalSync called for school ${schoolId}`);
      const cloudClient = this.dbConfig.getCloudClient();
      const localClient = this.dbConfig.getLocalClient();

      if (!localClient) {
        this.logger.warn('Local client not available for incremental sync');
        return { hasChanges: false, totalChanges: 0 };
      }

      let totalChanges = 0;

      // All 29 tables - unified sync with count + content check for all
      const allTables = [
        'school',
        'studentAttendance', 'staffAttendance', 'homework',
        'finance', 'leaverequest', 'tickets', 'feepayments',
        'rtefeepayment', 'exammarks',
        'attendance_user', 'busfeepayment', 'admin', 'classes', 'staff', 'students',
        'feestructure', 'busfeestructure', 'rtestructure', 'classtimetable',
        'examtimetable', 'holidays', 'imageandvideos', 'studentfees',
        'messages', 'appPayment'
      ];

      this.logger.log(`🔄 Periodic sync: Processing all ${allTables.length} tables with count + content check`);

      // Force refresh database connections for periodic sync
      this.logger.log(`🔄 Refreshing database connections for periodic sync...`);

      // Sync all tables using unified approach (count comparison + content check)
      for (const tableName of allTables) {
        this.logger.log(`🔍 Processing table: ${tableName}`);
        if (tableName === 'rtefeepayment') {
          this.logger.log(`🔍 DEBUG: Found rtefeepayment in sync loop - processing now`);
        }
        try {
          // Tables that need full sync (create/delete operations)
          const fullSyncTables = ['school', 'rtefeepayment', 'busfeepayment', 'feepayments', 'homework', 'tickets', 'exammarks', 'finance', 'leaverequest', 'messages'];

          if (fullSyncTables.includes(tableName)) {
            this.logger.log(`🔄 ${tableName}: Requires full sync for create/delete operations`);
            const changes = await this.syncFullTable(tableName, schoolId, cloudClient, localClient);
            totalChanges += changes;
          } else {
            // Other tables: use count + content check
            const shouldSkip = await this.checkTableCounts(tableName, schoolId, cloudClient, localClient);
            if (!shouldSkip) {
              this.logger.log(`🔄 ${tableName}: Counts differ, performing full sync`);
              const changes = await this.syncFullTable(tableName, schoolId, cloudClient, localClient);
              totalChanges += changes;
            } else {
              // Even if counts match, check if content actually differs
              this.logger.log(`🔍 ${tableName}: Counts match, checking content differences...`);
              try {
                const hasContentChanges = await this.checkContentChanges(tableName, schoolId, cloudClient, localClient);
                if (hasContentChanges) {
                  this.logger.log(`🔄 ${tableName}: Content differs, performing full sync`);
                  const changes = await this.syncFullTable(tableName, schoolId, cloudClient, localClient);
                  totalChanges += changes;
                } else {
                  this.logger.log(`✅ ${tableName}: No changes detected`);
                }
              } catch (contentError) {
                this.logger.error(`❌ ${tableName}: Content check failed: ${contentError.message}`);
                // On content check failure, do full sync as fallback
                const changes = await this.syncFullTable(tableName, schoolId, cloudClient, localClient);
                totalChanges += changes;
              }
            }
          }
        } catch (error) {
          this.logger.error(`Failed to check/sync ${tableName}: ${error.message}`);
        }
      }

      return {
        hasChanges: totalChanges > 0,
        totalChanges
      };
    } catch (error) {
      this.logger.error(`Incremental sync failed: ${error.message}`);
      return { hasChanges: false, totalChanges: 0 };
    }
  }

  // Check if content actually differs between cloud and local (even when counts match)
  private async checkContentChanges(tableName: string, schoolId: number, cloudClient: any, localClient: any): Promise<boolean> {
    try {
      // Check content for ALL tables, not just a whitelist
      this.logger.log(`🔍 Checking content differences for ${tableName}`);

      // Get sample data from cloud and local
      let cloudData: any[] = [];
      let localData: any[] = [];

      switch (tableName) {
        case 'school':
          const cloudSchool = await cloudClient.school?.findUnique?.({ where: { id: schoolId } });
          const localSchool = await localClient.school?.findUnique?.({ where: { id: schoolId } });
          cloudData = cloudSchool ? [cloudSchool] : [];
          localData = localSchool ? [localSchool] : [];
          break;
        case 'admin':
          cloudData = await cloudClient.admin?.findMany?.({
            where: { school_id: schoolId },
            take: 5, // Only check first 5 records for performance
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.admin?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'staff':
          cloudData = await cloudClient.staff?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.staff?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'students':
          cloudData = await cloudClient.student?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.student?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'classes':
          cloudData = await cloudClient.classes?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.classes?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'attendance_user':
          cloudData = await cloudClient.attendance_user?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.attendance_user?.findMany?.({
            where: { school_id: schoolId },
            take: 5,
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'busfeepayment':
          cloudData = await cloudClient.busFeePayment?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.busFeePayment?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'studentAttendance':
          cloudData = await cloudClient.studentAttendance?.findMany?.({
            where: { student: { school_id: schoolId } }
          }) || [];
          localData = await localClient.studentAttendance?.findMany?.({
            where: { student: { school_id: schoolId } }
          }) || [];
          break;
        case 'staffAttendance':
          cloudData = await cloudClient.staffAttendance?.findMany?.({
            where: { staff: { school_id: schoolId } }
          }) || [];
          localData = await localClient.staffAttendance?.findMany?.({
            where: { staff: { school_id: schoolId } }
          }) || [];
          break;
        case 'homework':
          cloudData = await cloudClient.homework?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.homework?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'finance':
          cloudData = await cloudClient.finance?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.finance?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'leaverequest':
          cloudData = await cloudClient.leaveRequest?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.leaveRequest?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'tickets':
          cloudData = await cloudClient.tickets?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.tickets?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'feepayments':
          cloudData = await cloudClient.feePayments?.findMany?.({
            where: { studentFee: { school_id: schoolId } },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.feePayments?.findMany?.({
            where: { studentFee: { school_id: schoolId } },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'rtefeepayment':
          cloudData = await cloudClient.rteFeePayment?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.rteFeePayment?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          this.logger.log(`🔍 rtefeepayment cloud IDs: [${cloudData.map(r => r.id).join(', ')}]`);
          this.logger.log(`🔍 rtefeepayment local IDs: [${localData.map(r => r.id).join(', ')}]`);
          this.logger.log(`🔍 rtefeepayment cloud count: ${cloudData.length}, local count: ${localData.length}`);
          this.logger.log(`🔍 DEBUG: rtefeepayment cloud records: ${JSON.stringify(cloudData.map(r => ({ id: r.id, student_id: r.student_id, amount_paid: r.amount_paid })), null, 2)}`);
          break;
        case 'exammarks':
          cloudData = await cloudClient.examMarks?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.examMarks?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'feestructure':
          cloudData = await cloudClient.feeStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.feeStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'busfeestructure':
          cloudData = await cloudClient.busFeeStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.busFeeStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'rtestructure':
          cloudData = await cloudClient.rteStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.rteStructure?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'classtimetable':
          this.logger.log(`🔍 Checking classtimetable content...`);
          try {
            cloudData = await cloudClient.classTimetable?.findMany?.({
              where: { schoolId: schoolId },
              orderBy: { id: 'asc' }
            }) || [];
            localData = await localClient.classTimetable?.findMany?.({
              where: { schoolId: schoolId },
              orderBy: { id: 'asc' }
            }) || [];
            this.logger.log(`🔍 classtimetable content check - Cloud: ${cloudData.length}, Local: ${localData.length}`);
            this.logger.log(`🔍 classtimetable cloud IDs: [${cloudData.map(r => r.id).join(', ')}]`);
            this.logger.log(`🔍 classtimetable local IDs: [${localData.map(r => r.id).join(', ')}]`);
          } catch (error) {
            this.logger.error(`❌ classtimetable content check error: ${error.message}`);
            cloudData = [];
            localData = [];
          }
          break;
        case 'examtimetable':
          cloudData = await cloudClient.examTimeTable?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.examTimeTable?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'holidays':
          cloudData = await cloudClient.holidays?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.holidays?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'imageandvideos':
          cloudData = await cloudClient.imageAndVideos?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.imageAndVideos?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'studentfees':
          cloudData = await cloudClient.studentFees?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.studentFees?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'messages':
          cloudData = await cloudClient.messages?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.messages?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        case 'appPayment':
          cloudData = await cloudClient.appPayment?.findMany?.({
            where: { schoolId: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient.appPayment?.findMany?.({
            where: { schoolId: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
        default:
          this.logger.log(`⚠️ ${tableName}: No case in checkContentChanges switch - using default query`);
          cloudData = await cloudClient[tableName]?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          localData = await localClient[tableName]?.findMany?.({
            where: { school_id: schoolId },
            orderBy: { id: 'asc' }
          }) || [];
          break;
      }

      // Compare content by checking updated_at or other timestamp fields
      this.logger.log(`🔍 ${tableName}: Comparing ${cloudData.length} cloud records with ${localData.length} local records`);
      let hasChanges = false;

      // Tables without id column - use simple comparison
      const tablesWithoutId = ['studentAttendance', 'staffAttendance'];
      if (tablesWithoutId.includes(tableName)) {
        // For tables without id, just compare record counts and updated_at fields
        if (cloudData.length !== localData.length) {
          this.logger.log(`🔄 ${tableName}: Record count differs - Cloud: ${cloudData.length}, Local: ${localData.length}`);
          return true;
        }
        // Compare by updated_at if available
        for (let i = 0; i < cloudData.length; i++) {
          if (cloudData[i].updated_at !== localData[i].updated_at) {
            this.logger.log(`🔄 ${tableName}: updated_at differs at index ${i}`);
            return true;
          }
        }
        return false;
      }

      // Create a map of local records by ID for efficient lookup
      const localRecordsMap = new Map();
      for (const localRecord of localData) {
        localRecordsMap.set(localRecord.id, localRecord);
      }

      // Compare each cloud record with corresponding local record by ID
      for (const cloudRecord of cloudData) {
        const localRecord = localRecordsMap.get(cloudRecord.id);
        if (!localRecord) {
          this.logger.log(`🔄 ${tableName}: Record ${cloudRecord.id} exists in cloud but not in local (new)`);
          hasChanges = true;
          break;
        }

        let keyFields = ['name', 'email', 'phone', 'updated_at', 'created_at', 'modified_at'];

        // Add table-specific fields for better comparison
        if (tableName === 'busfeepayment') {
          keyFields = ['amount', 'due_date', 'payment_date', 'status', 'student_id', 'updated_at', 'created_at'];
        } else if (tableName === 'attendance_user') {
          keyFields = ['username', 'email', 'phone', 'status', 'updated_at', 'created_at'];
        } else if (tableName === 'messages') {
          keyFields = ['messages', 'date', 'role', 'school_id'];
        } else if (tableName === 'rtefeepayment') {
          keyFields = ['amount_paid', 'payment_date', 'status', 'student_id', 'school_id', 'updated_at', 'created_at'];
          this.logger.log(`🔍 rtefeepayment: Using key fields: ${keyFields.join(', ')}`);
        }

        for (const field of keyFields) {
          const cloudValue = cloudRecord[field];
          const localValue = localRecord[field];

          // Handle null/undefined comparisons
          if ((cloudValue === null || cloudValue === undefined) && (localValue === null || localValue === undefined)) {
            continue; // Both null/undefined, no difference
          }
          if ((cloudValue === null || cloudValue === undefined) !== (localValue === null || localValue === undefined)) {
            this.logger.log(`🔄 ${tableName}: Field ${field} differs - Cloud: ${cloudValue}, Local: ${localValue}`);
            hasChanges = true;
            break;
          }
          if (cloudValue !== localValue) {
            this.logger.log(`🔄 ${tableName}: Field ${field} differs - Cloud: ${cloudValue}, Local: ${localValue}`);
            hasChanges = true;
            break;
          }
        }

        if (hasChanges) break;
      }

      // Check for records that exist in local but not in cloud (deleted)
      if (!hasChanges) {
        const cloudRecordsMap = new Map();
        for (const cloudRecord of cloudData) {
          cloudRecordsMap.set(cloudRecord.id, cloudRecord);
        }
        for (const localRecord of localData) {
          if (!cloudRecordsMap.has(localRecord.id)) {
            this.logger.log(`🔄 ${tableName}: Record ${localRecord.id} exists in local but not in cloud (deleted)`);
            hasChanges = true;
            break;
          }
        }
      }

      this.logger.log(`🔍 ${tableName}: Content comparison result - hasChanges: ${hasChanges}`);
      return hasChanges;
    } catch (error) {
      this.logger.error(`Content check failed for ${tableName}: ${error.message}`);
      return false; // Don't sync if there's an error
    }
  }

  // Check table counts between cloud and local
  private async checkTableCounts(tableName: string, schoolId: number, cloudClient: any, localClient: any): Promise<boolean> {
    try {
      let cloudCount = 0;
      let localCount = 0;

      switch (tableName) {
        case 'school':
          cloudCount = (await cloudClient.school?.findUnique?.({ where: { id: schoolId } })) ? 1 : 0;
          localCount = (await localClient.school?.findUnique?.({ where: { id: schoolId } })) ? 1 : 0;
          break;
        case 'attendance_user':
          // Try both field names for attendance_user
          this.logger.log(`🔍 Debugging attendance_user for schoolId: ${schoolId}`);
          try {
            cloudCount = await cloudClient.attendance_user?.count?.({ where: { school_id: schoolId } }) || 0;
            localCount = await localClient.attendance_user?.count?.({ where: { school_id: schoolId } }) || 0;
            this.logger.log(`🔍 attendance_user with school_id - Cloud: ${cloudCount}, Local: ${localCount}`);
          } catch (error) {
            try {
              cloudCount = await cloudClient.attendance_user?.count?.({ where: { schoolId: schoolId } }) || 0;
              localCount = await localClient.attendance_user?.count?.({ where: { schoolId: schoolId } }) || 0;
              this.logger.log(`🔍 attendance_user with schoolId - Cloud: ${cloudCount}, Local: ${localCount}`);
            } catch (error2) {
              this.logger.error(`❌ attendance_user count failed with both field names: ${error2.message}`);
              cloudCount = 0;
              localCount = 0;
            }
          }
          break;
        case 'admin':
          cloudCount = await cloudClient.admin?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.admin?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'classes':
          cloudCount = await cloudClient.classes?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.classes?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'staff':
          cloudCount = await cloudClient.staff?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.staff?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'students':
          cloudCount = await cloudClient.student?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.student?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'feestructure':
          cloudCount = await cloudClient.feeStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.feeStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'busfeestructure':
          cloudCount = await cloudClient.busFeeStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.busFeeStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'rtestructure':
          cloudCount = await cloudClient.rteStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.rteStructure?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'classtimetable':
          this.logger.log(`🔍 Checking classtimetable counts...`);
          try {
            cloudCount = await cloudClient.classTimetable?.count?.({
              where: { schoolId: schoolId }
            }) || 0;
            localCount = await localClient.classTimetable?.count?.({
              where: { schoolId: schoolId }
            }) || 0;
            this.logger.log(`🔍 classtimetable raw counts - Cloud: ${cloudCount}, Local: ${localCount}`);
          } catch (error) {
            this.logger.error(`❌ classtimetable count error: ${error.message}`);
            cloudCount = 0;
            localCount = 0;
          }
          break;
        case 'examtimetable':
          cloudCount = await cloudClient.examTimeTable?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          localCount = await localClient.examTimeTable?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          break;
        case 'holidays':
          cloudCount = await cloudClient.holidays?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.holidays?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'imageandvideos':
          cloudCount = await cloudClient.imageAndVideos?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.imageAndVideos?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'studentfees':
          cloudCount = await cloudClient.studentFees?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.studentFees?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'messages':
          cloudCount = await cloudClient.messages?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.messages?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'appPayment':
          this.logger.log(`🔍 Checking appPayment counts...`);
          try {
            cloudCount = await cloudClient.appPayment?.count?.({ where: { schoolId: schoolId } }) || 0;
            localCount = await localClient.appPayment?.count?.({ where: { schoolId: schoolId } }) || 0;
            this.logger.log(`🔍 appPayment raw counts - Cloud: ${cloudCount}, Local: ${localCount}`);
          } catch (error) {
            this.logger.error(`❌ appPayment count error: ${error.message}`);
            cloudCount = 0;
            localCount = 0;
          }
          break;
        case 'busfeepayment':
          this.logger.log(`🔍 Checking busfeepayment counts...`);
          try {
            cloudCount = await cloudClient.busFeePayment?.count?.({ where: { school_id: schoolId } }) || 0;
            localCount = await localClient.busFeePayment?.count?.({ where: { school_id: schoolId } }) || 0;
            this.logger.log(`🔍 busfeepayment raw counts - Cloud: ${cloudCount}, Local: ${localCount}`);
          } catch (error) {
            this.logger.error(`❌ busfeepayment count error: ${error.message}`);
            cloudCount = 0;
            localCount = 0;
          }
          break;
        case 'studentAttendance':
          cloudCount = await cloudClient.studentAttendance?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          localCount = await localClient.studentAttendance?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          break;
        case 'staffAttendance':
          cloudCount = await cloudClient.staffAttendance?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          localCount = await localClient.staffAttendance?.count?.({
            where: { school_id: schoolId }
          }) || 0;
          break;
        case 'finance':
          cloudCount = await cloudClient.finance?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.finance?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'leaverequest':
          cloudCount = await cloudClient.leaveRequest?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.leaveRequest?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'tickets':
          cloudCount = await cloudClient.tickets?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.tickets?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'feepayments':
          cloudCount = await cloudClient.feePayments?.count?.({
            where: {
              studentFee: { school_id: schoolId }
            }
          }) || 0;
          localCount = await localClient.feePayments?.count?.({
            where: {
              studentFee: { school_id: schoolId }
            }
          }) || 0;
          break;
        case 'rtefeepayment':
          cloudCount = await cloudClient.rteFeePayment?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.rteFeePayment?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
        case 'exammarks':
          cloudCount = await cloudClient.examMarks?.count?.({ where: { school_id: schoolId } }) || 0;
          localCount = await localClient.examMarks?.count?.({ where: { school_id: schoolId } }) || 0;
          break;
      }

      const countsMatch = cloudCount === localCount;

      // Add detailed debugging
      this.logger.log(`🔍 ${tableName} count comparison - Cloud: ${cloudCount}, Local: ${localCount}, Match: ${countsMatch}`);

      if (countsMatch) {
        this.logger.log(`⏭️ ${tableName} counts match: ${cloudCount} records - will check content`);
      } else {
        this.logger.log(`🔄 ${tableName} counts differ - Cloud: ${cloudCount}, Local: ${localCount} - will sync`);
      }

      // Return true if counts match (should skip full sync, check content instead)
      // Return false if counts differ (should do full sync)
      return countsMatch;
    } catch (error) {
      this.logger.error(`Count comparison failed for ${tableName}: ${error.message}`);
      return false; // Don't skip if there's an error
    }
  }

  // Sync full table for tables without updated_at field
  private async syncFullTable(tableName: string, schoolId: number, cloudClient: any, localClient: any): Promise<number> {
    try {
      let cloudData: any[] = [];
      let localData: any[] = [];

      // Get all data from cloud for tables without updated_at
      switch (tableName) {
        case 'school':
          const cloudSchoolRecord = await cloudClient.school?.findUnique?.({ where: { id: schoolId } });
          const localSchoolRecord = await localClient.school?.findUnique?.({ where: { id: schoolId } });
          cloudData = cloudSchoolRecord ? [cloudSchoolRecord] : [];
          localData = localSchoolRecord ? [localSchoolRecord] : [];
          break;
        case 'attendance_user':
          cloudData = await cloudClient.attendance_user?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.attendance_user?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'admin':
          cloudData = await cloudClient.admin?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.admin?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'classes':
          cloudData = await cloudClient.classes?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.classes?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'staff':
          cloudData = await cloudClient.staff?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.staff?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'students':
          cloudData = await cloudClient.student?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.student?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'feestructure':
          cloudData = await cloudClient.feeStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.feeStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'busfeestructure':
          cloudData = await cloudClient.busFeeStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.busFeeStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'rtestructure':
          cloudData = await cloudClient.rteStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.rteStructure?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'classtimetable':
          this.logger.log(`🔍 Syncing classtimetable full table...`);
          try {
            cloudData = await cloudClient.classTimetable?.findMany?.({
              where: { schoolId: schoolId }
            }) || [];
            localData = await localClient.classTimetable?.findMany?.({
              where: { schoolId: schoolId }
            }) || [];
            this.logger.log(`🔍 classtimetable full sync - Cloud: ${cloudData.length}, Local: ${localData.length}`);
          } catch (error) {
            this.logger.error(`❌ classtimetable fetch error: ${error.message}`);
            cloudData = [];
            localData = [];
          }
          break;
        case 'examtimetable':
          cloudData = await cloudClient.examTimeTable?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.examTimeTable?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'holidays':
          cloudData = await cloudClient.holidays?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.holidays?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'imageandvideos':
          cloudData = await cloudClient.imageAndVideos?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.imageAndVideos?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'studentfees':
          cloudData = await cloudClient.studentFees?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.studentFees?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'messages':
          cloudData = await cloudClient.messages?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.messages?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'appPayment':
          this.logger.log(`🔍 Syncing appPayment full table...`);
          try {
            cloudData = await cloudClient.appPayment?.findMany?.({
              where: { schoolId: schoolId }
            }) || [];
            localData = await localClient.appPayment?.findMany?.({
              where: { schoolId: schoolId }
            }) || [];
            this.logger.log(`🔍 appPayment found ${cloudData.length} records in cloud, ${localData.length} records in local`);
          } catch (error) {
            this.logger.error(`❌ appPayment fetch error: ${error.message}`);
            cloudData = [];
            localData = [];
          }
          break;
        case 'busfeepayment':
          this.logger.log(`🔍 Syncing busfeepayment full table...`);
          try {
            cloudData = await cloudClient.busFeePayment?.findMany?.({
              where: { school_id: schoolId }
            }) || [];
            localData = await localClient.busFeePayment?.findMany?.({
              where: { school_id: schoolId }
            }) || [];
            this.logger.log(`🔍 busfeepayment fetched - Cloud: ${cloudData.length}, Local: ${localData.length}`);
          } catch (error) {
            this.logger.error(`❌ busfeepayment fetch error: ${error.message}`);
            cloudData = [];
            localData = [];
          }
          break;
        case 'studentAttendance':
          cloudData = await cloudClient.studentAttendance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.studentAttendance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'staffAttendance':
          cloudData = await cloudClient.staffAttendance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.staffAttendance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'homework':
          cloudData = await cloudClient.homework?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.homework?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'finance':
          cloudData = await cloudClient.finance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.finance?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'leaverequest':
          cloudData = await cloudClient.leaveRequest?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.leaveRequest?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'tickets':
          cloudData = await cloudClient.tickets?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.tickets?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'feepayments':
          cloudData = await cloudClient.feePayments?.findMany?.({
            where: { studentFee: { school_id: schoolId } }
          }) || [];
          localData = await localClient.feePayments?.findMany?.({
            where: { studentFee: { school_id: schoolId } }
          }) || [];
          break;
        case 'rtefeepayment':
          cloudData = await cloudClient.rteFeePayment?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.rteFeePayment?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
        case 'exammarks':
          cloudData = await cloudClient.examMarks?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          localData = await localClient.examMarks?.findMany?.({
            where: { school_id: schoolId }
          }) || [];
          break;
      }

      // Create ID or composite key sets for comparison
      const isAttendanceTable = ['studentAttendance', 'staffAttendance'].includes(tableName);

      const getRecordKey = (item: any) => {
        if (isAttendanceTable) {
          // Composite key for attendance: username + school_id + date
          const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date).split('T')[0];
          return `${item.username}|${item.school_id}|${dateStr}`;
        }
        return item.id;
      };

      const cloudKeys = new Set(cloudData.map(item => getRecordKey(item)));
      const localKeys = new Set(localData.map(item => getRecordKey(item)));

      // Delete records that exist locally but not in cloud
      const recordsToDelete = localData.filter(item => !cloudKeys.has(getRecordKey(item)));
      this.logger.log(`🔍 ${tableName}: Records to delete: ${recordsToDelete.length}, Keys: [${recordsToDelete.map(r => getRecordKey(r)).join(', ')}]`);
      let deletedCount = 0;
      for (const record of recordsToDelete) {
        try {
          // Check for sync_status to prevent deleting pending local data
          if ((record as any).sync_status === 'pending') {
            this.logger.log(`⏭️ Skipping deletion of ${tableName} record ${getRecordKey(record)} - sync_status is pending`);
            continue;
          }

          if (isAttendanceTable) {
            // Handle composite key deletion for attendance
            const dateStr = record.date instanceof Date ? record.date.toISOString().split('T')[0] : String(record.date).split('T')[0];
            const deleteWhere: any = {};
            if (tableName === 'studentAttendance') {
              deleteWhere.username_school_date = {
                username: record.username,
                school_id: record.school_id,
                date: new Date(dateStr)
              };
            } else {
              deleteWhere.username_school_date_staff = {
                username: record.username,
                school_id: record.school_id,
                date: new Date(dateStr)
              };
            }
            await localClient[tableName].delete({ where: deleteWhere });
          } else {
            await this.deleteRecord(tableName, record.id, localClient);
          }
          deletedCount++;
          this.logger.log(`🗑️ Deleted ${tableName} record ${getRecordKey(record)} (exists locally but not in cloud)`);
        } catch (error) {
          this.logger.error(`Failed to delete ${tableName} record ${getRecordKey(record)}: ${error.message}`);
        }
      }

      // Upsert cloud records to local
      let syncedCount = 0;
      for (const item of cloudData) {
        this.logger.log(`🔄 ${tableName}: Upserting record Key: ${getRecordKey(item)}`);
        try {
          await this.upsertFullTableRow(tableName, item, localClient);
          syncedCount++;
        } catch (error) {
          this.logger.error(`Failed to upsert ${tableName} row ${getRecordKey(item)}: ${error.message}`);
        }
      }

      this.logger.log(`🔄 ${tableName}: ${syncedCount} upserted, ${deletedCount} deleted`);
      return syncedCount + deletedCount;
    } catch (error) {
      this.logger.error(`Failed to sync full table ${tableName}: ${error.message}`);
      return 0;
    }
  }

  // Generic delete method for full table sync
  private async deleteRecord(tableName: string, recordId: number, localClient: any): Promise<void> {
    try {
      switch (tableName) {
        case 'school':
          await localClient.school?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'attendance_user':
          await localClient.attendance_user?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'admin':
          await localClient.admin?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'classes':
          await localClient.classes?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'staff':
          await localClient.staff?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'students':
          await localClient.student?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'feestructure':
          await localClient.feeStructure?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'busfeestructure':
          await localClient.busFeeStructure?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'rtestructure':
          await localClient.rteStructure?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'classtimetable':
          await localClient.classTimetable?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'examtimetable':
          await localClient.examTimeTable?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'holidays':
          await localClient.holidays?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'imageandvideos':
          await localClient.imageAndVideos?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'studentfees':
          await localClient.studentFees?.delete?.({
            where: { aId: recordId }
          });
          break;
        case 'messages':
          await localClient.messages?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'appPayment':
          await localClient.appPayment?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'busfeepayment':
          this.logger.log(`🔍 Deleting busfeepayment record ID: ${recordId}`);
          try {
            await localClient.busFeePayment?.delete?.({
              where: { id: recordId }
            });
            this.logger.log(`✅ busfeepayment record ${recordId} deleted successfully`);
          } catch (error) {
            this.logger.error(`❌ busfeepayment delete error for record ${recordId}: ${error.message}`);
            throw error;
          }
          break;
        case 'rtefeepayment':
          await localClient.rteFeePayment?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'feepayments':
          await localClient.feePayments?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'finance':
          await localClient.finance?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'leaverequest':
          await localClient.leaveRequest?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'exammarks':
          await localClient.examMarks?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'homework':
          await localClient.homework?.delete?.({
            where: { id: recordId }
          });
          break;
        case 'tickets':
          await localClient.tickets?.delete?.({
            where: { id: recordId }
          });
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to delete ${tableName} record ${recordId}: ${error.message}`);
      throw error;
    }
  }

  // Generic upsert method for full table sync
  private async upsertFullTableRow(tableName: string, item: any, localClient: any): Promise<void> {
    try {
      switch (tableName) {
        case 'school':
          await localClient.school?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'attendance_user':
          await localClient.attendance_user?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'admin':
          await localClient.admin?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'classes':
          await localClient.classes?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'staff':
          await localClient.staff?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'students':
          await localClient.student?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'feestructure':
          await localClient.feeStructure?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'busfeestructure':
          await localClient.busFeeStructure?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'rtestructure':
          await localClient.rteStructure?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'classtimetable':
          await localClient.classTimetable?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'examtimetable':
          await localClient.examTimeTable?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'holidays':
          await localClient.holidays?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'imageandvideos':
          await localClient.imageAndVideos?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'studentfees':
          await localClient.studentFees?.upsert?.({
            where: { aId: item.aId },
            update: item as any,
            create: item as any
          });
          break;
        case 'messages':
          await localClient.messages?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'appPayment':
          this.logger.log(`🔍 Upserting appPayment record ID: ${item.id}`);
          try {
            await localClient.appPayment?.upsert?.({
              where: { id: item.id },
              update: item as any,
              create: item as any
            });
            this.logger.log(`✅ appPayment record ${item.id} upserted successfully`);
          } catch (error) {
            this.logger.error(`❌ appPayment upsert error for record ${item.id}: ${error.message}`);
            throw error;
          }
          break;
        case 'exammarks':
          await localClient.examMarks?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'studentAttendance':
          await localClient.studentAttendance?.upsert?.({
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
          break;
        case 'staffAttendance':
          await localClient.staffAttendance?.upsert?.({
            where: {
              username_school_date_staff: {
                username: item.username,
                school_id: item.school_id,
                date: item.date
              }
            },
            update: item as any,
            create: item as any
          });
          break;
        case 'homework':
          await localClient.homework?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'tickets':
          await localClient.tickets?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'feepayments':
          await localClient.feePayments?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'finance':
          await localClient.finance?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'leaverequest':
          await localClient.leaveRequest?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'rtefeepayment':
          await localClient.rteFeePayment?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
        case 'busfeepayment':
          await localClient.busFeePayment?.upsert?.({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to upsert ${tableName} row ${item.id}: ${error.message}`);
    }
  }

  // Sync only updated rows for a specific table
  private async syncUpdatedRows(tableName: string, schoolId: number, lastSyncTime: Date, cloudClient: any, localClient: any): Promise<number> {
    try {
      let cloudData: any[] = [];

      // Add debugging
      this.logger.log(`🔍 Checking ${tableName} for updates since ${lastSyncTime.toISOString()}`);

      // Get updated rows from cloud since last sync
      switch (tableName) {
        case 'studentAttendance':
          cloudData = await cloudClient.studentAttendance.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'staffAttendance':
          cloudData = await cloudClient.staffAttendance.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'homework':
          cloudData = await cloudClient.homework.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'finance':
          cloudData = await cloudClient.finance.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'leaverequest':
          cloudData = await cloudClient.leaveRequest.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'tickets':
          cloudData = await cloudClient.tickets.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'feepayments':
          cloudData = await cloudClient.feePayments.findMany({
            where: {
              studentFee: { school_id: schoolId },
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'rtefeepayment':
          cloudData = await cloudClient.rteFeePayment.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
        case 'exammarks':
          cloudData = await cloudClient.examMarks.findMany({
            where: {
              school_id: schoolId,
              updated_at: { gt: lastSyncTime }
            },
            orderBy: { updated_at: 'asc' }
          });
          break;
      }

      // Add debugging
      this.logger.log(`🔍 ${tableName} found ${cloudData.length} updated rows since ${lastSyncTime.toISOString()}`);

      // Upsert updated rows to local
      let syncedCount = 0;
      for (const item of cloudData) {
        try {
          await this.upsertRow(tableName, item, localClient);
          syncedCount++;
        } catch (error) {
          this.logger.error(`Failed to upsert ${tableName} row ${item.id}: ${error.message}`);
        }
      }

      return syncedCount;
    } catch (error) {
      this.logger.error(`Failed to sync updated rows for ${tableName}: ${error.message}`);
      return 0;
    }
  }

  // Generic upsert method for different table types
  private async upsertRow(tableName: string, item: any, localClient: any): Promise<void> {
    switch (tableName) {
      case 'studentAttendance':
        await localClient.studentAttendance.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'staffAttendance':
        await localClient.staffAttendance.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'homework':
        await localClient.homework.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'finance':
        await localClient.finance.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'leaverequest':
        await localClient.leaveRequest.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'tickets':
        await localClient.tickets.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'feepayments':
        await localClient.feePayments.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'busfeepayment':
        this.logger.log(`🔍 Upserting busfeepayment record ID: ${item.id}`);
        try {
          await localClient.busFeePayment.upsert({
            where: { id: item.id },
            update: item as any,
            create: item as any
          });
          this.logger.log(`✅ busfeepayment record ${item.id} upserted successfully`);
        } catch (error) {
          this.logger.error(`❌ busfeepayment upsert error for record ${item.id}: ${error.message}`);
          throw error;
        }
        break;
      case 'rtefeepayment':
        await localClient.rteFeePayment?.upsert?.({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
      case 'exammarks':
        await localClient.examMarks?.upsert?.({
          where: { id: item.id },
          update: item as any,
          create: item as any
        });
        break;
    }
  }

  // Stop periodic sync for specific school
  stopPeriodicSyncForSchool(schoolId: number): void {
    console.log(`🔓 DEBUG: Attempting to stop sync for school ${schoolId}`);
    console.log(`🔓 DEBUG: Current intervals before stop:`, Array.from(this.periodicSyncIntervals.keys()));

    const interval = this.periodicSyncIntervals.get(schoolId);
    if (interval) {
      console.log(`🔓 DEBUG: Found interval for school ${schoolId}, clearing it`);
      clearInterval(interval);
      this.periodicSyncIntervals.delete(schoolId);
      console.log(`🔓 DEBUG: Interval deleted. Remaining intervals:`, Array.from(this.periodicSyncIntervals.keys()));
      this.logger.log(`⏹️ Periodic sync stopped for school ${schoolId}`);
    } else {
      console.log(`🔓 DEBUG: No interval found for school ${schoolId}`);
      console.log(`🔓 DEBUG: Available intervals:`, Array.from(this.periodicSyncIntervals.entries()));
    }
  }

  // Stop all periodic syncs
  stopAllPeriodicSyncs(): void {
    for (const [schoolId, interval] of this.periodicSyncIntervals) {
      clearInterval(interval);
      this.logger.log(`⏹️ Periodic sync stopped for school ${schoolId}`);
    }
    this.periodicSyncIntervals.clear();
  }

  // Get sync status for school
  getSyncStatus(schoolId: number): {
    isSyncInProgress: boolean;
    isPeriodicSyncRunning: boolean;
    isHybridMode: boolean;
    isActiveSchool: boolean;
  } {
    return {
      isSyncInProgress: this.syncInProgress.get(schoolId) || false,
      isPeriodicSyncRunning: this.periodicSyncIntervals.has(schoolId),
      isHybridMode: this.dbConfig.isHybridMode(),
      isActiveSchool: this.activeSchools.has(schoolId)
    };
  }

  // Get status for all schools
  getAllSyncStatus(): {
    activeSchools: number[];
    periodicSyncSchools: number[];
    syncInProgressSchools: number[];
    isHybridMode: boolean;
  } {
    return {
      activeSchools: Array.from(this.activeSchools),
      periodicSyncSchools: Array.from(this.periodicSyncIntervals.keys()),
      syncInProgressSchools: Array.from(this.syncInProgress.keys()).filter(id => this.syncInProgress.get(id)),
      isHybridMode: this.dbConfig.isHybridMode()
    };
  }

  // Force trigger sync for school (manual override)
  async forceTriggerSync(schoolId: number): Promise<{ success: boolean; message: string }> {
    this.logger.log(`🔄 Force triggering sync for school ${schoolId}`);

    // Reset sync progress
    this.syncInProgress.set(schoolId, false);

    // Trigger sync
    return await this.triggerLoginSync(schoolId);
  }
}
