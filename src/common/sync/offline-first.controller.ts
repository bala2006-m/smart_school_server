import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { OfflineFirstService } from './offline-first.service';
import { SimpleWebSocketGateway } from '../websocket/simple_websocket.gateway';
import { CloudToLocalSyncService } from './cloud-to-local.service';
import { SimpleInitialSyncService } from './simple-initial-sync.service';
import { StartupSyncService } from './startup-sync.service';
import { LoginSyncService } from './login-sync.service';
import { DatabaseConfigService } from '../database/database.config';

@Controller('offline')
export class OfflineFirstController {
  constructor(
    private readonly offlineFirstService: OfflineFirstService,
    private readonly websocketGateway: SimpleWebSocketGateway,
    private readonly cloudToLocalSyncService: CloudToLocalSyncService,
    private readonly simpleInitialSyncService: SimpleInitialSyncService,
    private readonly startupSyncService: StartupSyncService,
    private readonly loginSyncService: LoginSyncService,
    private readonly dbConfig: DatabaseConfigService,
  ) { }

  @Get('status')
  getOfflineStatus() {
    const status = this.offlineFirstService.getOfflineStatus();

    return {
      status: 'success',
      data: {
        ...status,
        message: status.isDesktopMode
          ? 'Desktop offline-first mode active'
          : 'Cloud-only mode active',
        connectivity: status.isOnline ? 'Online' : 'Offline',
        pendingOperations: status.pendingOperations,
      },
    };
  }

  @Get('sync-status')
  getSyncStatus() {
    const status = this.simpleInitialSyncService.getSyncStatus();

    return {
      status: 'success',
      data: {
        ...status,
        message: 'Simple sync service ready',
      },
    };
  }

  @Post('test-sync')
  async testSync(@Body() testData: { tableName: string; operation: string; data: any }) {
    try {
      // Test the sync functionality
      await this.offlineFirstService.storeLocally(
        testData.tableName,
        testData.operation as 'create' | 'update' | 'delete',
        testData.data,
      );

      return {
        status: 'success',
        message: `Test sync completed for ${testData.operation} on ${testData.tableName}`,
        data: testData,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Test sync failed: ${error.message}`,
      };
    }
  }

  @Post('force-sync')
  async forceSyncAll() {
    try {
      const result = await this.offlineFirstService.forceSyncAll();

      // Broadcast sync status to all clients
      this.websocketGateway.broadcastSyncStatus();

      return {
        status: 'success',
        message: `Force sync completed: ${result.success} successful, ${result.failed} failed`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Force sync failed: ${error.message}`,
      };
    }
  }

  @Post('check-connectivity')
  async checkConnectivity() {
    try {
      await this.offlineFirstService.checkConnectivity();
      const status = this.offlineFirstService.getOfflineStatus();

      return {
        status: 'success',
        data: {
          isOnline: status.isOnline,
          message: status.isOnline ? 'Connected to cloud' : 'Working offline',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Connectivity check failed: ${error.message}`,
        data: {
          isOnline: false,
          message: 'Unable to connect to cloud',
        },
      };
    }
  }

  @Post('clear-synced')
  clearSyncedOperations() {
    this.offlineFirstService.clearSyncedOperations();

    return {
      status: 'success',
      message: 'Cleared synced operations from queue',
    };
  }

  @Get('pending-operations')
  getPendingOperations() {
    const status = this.offlineFirstService.getOfflineStatus();

    return {
      status: 'success',
      data: {
        operations: status.pendingOperationsList,
        count: status.pendingOperations,
      },
    };
  }

  @Post('sync-from-cloud')
  async syncFromCloud(@Body() body: { schoolId: number }) {
    try {
      const result = await this.cloudToLocalSyncService.performFullCloudToLocalSync(body.schoolId);

      this.websocketGateway.broadcastSyncStatus();

      return {
        status: 'success',
        message: `Synced ${result.messages} messages from cloud to local`,
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Cloud-to-local sync failed: ${error.message}`,
      };
    }
  }

  @Post('initial-sync')
  async performInitialSync(@Body() body: { schoolId: number }) {
    try {
      const result = await this.simpleInitialSyncService.performSimpleInitialSync(body.schoolId);

      if (result.success) {
        return {
          status: 'success',
          message: `SIMPLE initial sync completed: ${result.synced.total} records synced`,
          data: result.synced,
        };
      } else {
        return {
          status: 'error',
          message: 'SIMPLE initial sync failed',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `SIMPLE initial sync failed: ${error.message}`,
      };
    }
  }

  @Post('start-periodic-sync')
  async startPeriodicSync(@Body() body: { schoolId: number }) {
    try {
      this.loginSyncService.startPeriodicSyncForSchool(body.schoolId);

      return {
        status: 'success',
        message: `Periodic sync started for school ${body.schoolId}`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to start periodic sync: ${error.message}`,
      };
    }
  }

  @Post('trigger-startup-sync')
  async triggerStartupSync(@Body() body: { schoolId: number }) {
    try {
      await this.startupSyncService.triggerManualSync(body.schoolId);

      return {
        status: 'success',
        message: `Manual SIMPLE startup sync triggered for school ${body.schoolId}`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Manual SIMPLE startup sync failed: ${error.message}`,
      };
    }
  }

  // Login-triggered sync endpoints
  @Post('login-sync')
  async triggerLoginSync(@Body() body: { schoolId: number; userId?: string }) {
    try {
      const result = await this.loginSyncService.triggerLoginSync(body.schoolId, body.userId);

      return {
        status: result.success ? 'success' : 'error',
        message: result.message,
        data: result.synced || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Login sync failed: ${error.message}`,
      };
    }
  }

  @Post('force-login-sync')
  async forceLoginSync(@Body() body: { schoolId: number }) {
    try {
      const result = await this.loginSyncService.forceTriggerSync(body.schoolId);

      return {
        status: result.success ? 'success' : 'error',
        message: result.message,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Force login sync failed: ${error.message}`,
      };
    }
  }

  @Get('login-sync-status/:schoolId')
  getLoginSyncStatus(@Param('schoolId') schoolId: number) {
    const status = this.loginSyncService.getSyncStatus(schoolId);

    return {
      status: 'success',
      data: status,
    };
  }

  @Get('all-sync-status')
  getAllSyncStatus() {
    const status = this.loginSyncService.getAllSyncStatus();

    return {
      status: 'success',
      data: status,
    };
  }

  @Post('stop-periodic-sync/:schoolId')
  stopPeriodicSync(@Param('schoolId') schoolId: number) {
    try {
      this.loginSyncService.stopPeriodicSyncForSchool(schoolId);

      return {
        status: 'success',
        message: `Periodic sync stopped for school ${schoolId}`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to stop periodic sync: ${error.message}`,
      };
    }
  }

  // Quick manual sync endpoint for when cloud DB changes are made
  @Post('manual-sync')
  async quickManualSync(@Body() body: { schoolId: number; userId?: string }) {
    try {
      const schoolId = body.schoolId || 1; // Default to school 1 if not provided

      // Perform initial sync to get latest data from cloud
      const initialResult = await this.simpleInitialSyncService.performSimpleInitialSync(schoolId);

      if (initialResult.success) {
        // Also trigger login sync to ensure user-specific data is synced
        const loginResult = await this.loginSyncService.triggerLoginSync(schoolId, body.userId);

        // Broadcast sync status to all connected clients
        this.websocketGateway.broadcastSyncStatus();

        return {
          status: 'success',
          message: `Manual sync completed: ${initialResult.synced.total} records synced. ${loginResult.message}`,
          data: {
            initialSync: initialResult.synced,
            loginSync: loginResult.synced || null,
            totalRecords: initialResult.synced.total,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          status: 'error',
          message: 'Manual sync failed during initial sync',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Manual sync failed: ${error.message}`,
      };
    }
  }

  // Test endpoint to verify periodic sync is working
  @Post('test-periodic-sync')
  async testPeriodicSync(@Body() body: { schoolId: number }) {
    try {
      const schoolId = body.schoolId || 1;

      // Check if periodic sync is already running
      const status = this.loginSyncService.getSyncStatus(schoolId);

      if (status.isPeriodicSyncRunning) {
        return {
          status: 'info',
          message: `Periodic sync is already running for school ${schoolId}`,
          data: status
        };
      }

      // Start periodic sync
      this.loginSyncService.startPeriodicSyncForSchool(schoolId);

      return {
        status: 'success',
        message: `Periodic sync started for school ${schoolId}. Check logs for activity every 5 seconds.`,
        data: {
          schoolId,
          interval: '5 seconds',
          startTime: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to start periodic sync: ${error.message}`,
      };
    }
  }

  // Force immediate periodic sync execution
  @Post('force-periodic-execution')
  async forcePeriodicExecution(@Body() body: { schoolId: number }) {
    try {
      const schoolId = body.schoolId || 1;

      // Force one execution of sync
      const result = await this.simpleInitialSyncService.performSimpleInitialSync(schoolId);

      return {
        status: 'success',
        message: `Forced periodic sync executed: ${result.synced.total} records synced`,
        data: {
          schoolId,
          synced: result.synced,
          executionTime: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Forced periodic sync failed: ${error.message}`,
      };
    }
  }

  // Health check for periodic sync
  @Get('periodic-sync-health/:schoolId')
  async getPeriodicSyncHealth(@Param('schoolId') schoolId: number) {
    try {
      const status = this.loginSyncService.getSyncStatus(schoolId);
      const overallStatus = this.loginSyncService.getAllSyncStatus();

      return {
        status: 'success',
        data: {
          schoolId,
          isPeriodicSyncRunning: status.isPeriodicSyncRunning,
          isSyncInProgress: status.isSyncInProgress,
          isHybridMode: status.isHybridMode,
          isActiveSchool: status.isActiveSchool,
          allSchoolsStatus: overallStatus,
          timestamp: new Date().toISOString(),
          recommendations: this.getHealthRecommendations(status)
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error.message}`,
      };
    }
  }

  // Handle user logout and switch periodic sync
  @Post('user-logout')
  async handleUserLogout(@Body() body: { schoolId: number; userId?: string }) {
    console.log('🔓 CONTROLLER: user-logout endpoint HIT!!!');
    try {
      const schoolId = body.schoolId;
      console.log(`🔓 CONTROLLER DEBUG: logout endpoint called with schoolId=${schoolId}, userId=${body.userId}`);

      const result = await this.loginSyncService.handleUserLogout(schoolId, body.userId);

      return {
        status: 'success',
        message: result.message,
        data: {
          schoolId,
          loggedOutUserId: body.userId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.log('🔓 CONTROLLER ERROR:', error);
      return {
        status: 'error',
        message: `Logout handling failed: ${error.message}`,
      };
    }
  }

  // Test endpoint to verify server is running latest code
  @Post('test-endpoint')
  async testEndpoint() {
    console.log('🧪 TEST ENDPOINT HIT!!!');
    return {
      status: 'success',
      message: 'Test endpoint working',
      timestamp: new Date().toISOString()
    };
  }

  // Frontend-triggered initial sync (replaces startup sync)
  @Post('trigger-initial-sync')
  async triggerInitialSync(@Body() body: { schoolId: number; userId?: string }, @Req() request: any) {
    try {
      const schoolId = body.schoolId;
      const userId = body.userId;

      console.log(`🎯 Frontend triggered initial sync for school ${schoolId} ${userId ? `(user: ${userId})` : ''}`);

      // Check if request is from mobile platform - block ALL sync for mobile users
      const userAgent = request?.headers?.['user-agent']?.toLowerCase() || '';
      const mobileAppIndicators = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod',
        'blackberry', 'windows phone', 'palm', 'webos',
        'flutter', 'dart', 'okhttp', 'wv' // Flutter/Dart specific indicators
      ];
      const mobileBrowserIndicators = [
        'mobile safari', 'chrome mobile', 'firefox mobile', 'opera mobile'
      ];
      const isMobileApp = mobileAppIndicators.some(indicator => userAgent.includes(indicator));
      const isMobileBrowser = mobileBrowserIndicators.some(indicator => userAgent.includes(indicator));

      // Block ALL mobile (apps and browsers)
      if ((isMobileApp || isMobileBrowser) && userAgent.length > 0) {
        console.log(`📱 Mobile platform detected - BLOCKING ALL sync for school ${schoolId} (user: ${userId})`);
        return {
          status: 'blocked',
          message: `Sync blocked for mobile users - offline mode only`,
          data: {
            schoolId,
            blockedUserId: userId,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Check if online before performing initial cloud sync
      const syncStatus = this.dbConfig.getSyncStatus();
      if (!syncStatus.isCloudOnline || !syncStatus.isHybridMode) {
        console.log(`⚠️ Offline mode active or local DB not found. Skipping initial cloud sync for school ${schoolId}.`);

        // We still trigger loginSyncService so it can start the periodic sync interval
        // which will handle its own offline checks internally and sync when back online
        await this.loginSyncService.triggerLoginSync(schoolId, userId, request);

        return {
          status: 'success',
          message: `Offline mode active for school ${schoolId}. Sync is queued for when network is available.`,
          data: {
            schoolId,
            userId: userId,
            initialSyncResult: { success: true, synced: { total: 0, message: "Offline mode active" } },
            periodicSyncStarted: true,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Trigger initial sync
      const result = await this.startupSyncService.triggerManualSync(schoolId);

      // Also start periodic sync for this school (with platform detection)
      await this.loginSyncService.triggerLoginSync(schoolId, userId, request);

      return {
        status: 'success',
        message: `Initial sync triggered for school ${schoolId}`,
        data: {
          schoolId,
          userId: userId,
          initialSyncResult: result,
          periodicSyncStarted: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Initial sync trigger failed: ${error.message}`,
      };
    }
  }

  private getHealthRecommendations(status: any): string[] {
    const recommendations: string[] = [];

    if (!status.isHybridMode) {
      recommendations.push('Enable hybrid mode to activate periodic sync');
    }

    if (!status.isPeriodicSyncRunning) {
      recommendations.push('Start periodic sync using /offline/test-periodic-sync endpoint');
    }

    if (status.isSyncInProgress) {
      recommendations.push('Sync currently in progress - wait for completion');
    }

    if (recommendations.length === 0) {
      recommendations.push('Periodic sync is healthy and active');
    }

    return recommendations;
  }
}
