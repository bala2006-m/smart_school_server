import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface DatabaseConfig {
  type: 'cloud' | 'local' | 'hybrid' | 'mobile-cloud' | 'desktop-local' | 'web-local';
  cloudClient: PrismaClient;
  localClient?: PrismaClient;
  isLocalAvailable: boolean;
  platform: 'mobile' | 'desktop' | 'web' | 'unknown';
}

interface PendingWrite {
  tableName: string;
  methodName: string;
  args: any[];
  timestamp: Date;
  retryCount: number;
}

// Methods that read data
const READ_METHODS = new Set([
  'findUnique', 'findUniqueOrThrow',
  'findFirst', 'findFirstOrThrow',
  'findMany',
  'count', 'aggregate', 'groupBy',
]);

// Methods that mutate data — these should go to BOTH databases
const WRITE_METHODS = new Set([
  'create', 'createMany', 'createManyAndReturn',
  'update', 'updateMany', 'updateManyAndReturn',
  'upsert',
  'delete', 'deleteMany',
]);

@Injectable()
export class DatabaseConfigService implements OnModuleDestroy {
  private config: DatabaseConfig;
  private readonly logger = new Logger(DatabaseConfigService.name);
  private dualWriteProxy: PrismaClient | null = null;

  // Connectivity & offline sync state
  private isCloudOnline = true;
  private pendingWrites: PendingWrite[] = [];
  private connectivityInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    this.config = this.initializeDatabaseConfig();
    this.startBackgroundJobs();
  }

  private initializeDatabaseConfig(): DatabaseConfig {
    const cloudClient = new PrismaClient({
      datasources: {
        db: {
          url: 'mysql://schoolAttendance:Sensarsoft%40123@[2a02:4780:12:f6a7::1]:3306/ramchin_smart_school',
        },
      },
    });

    const platform = this.detectPlatform();

    if (platform === 'mobile') {
      return {
        type: 'mobile-cloud',
        cloudClient,
        isLocalAvailable: false,
        platform,
      };
    }

    const isLocalAvailable = this.checkLocalDatabaseAvailability();
    let localClient: PrismaClient | undefined;

    if (isLocalAvailable) {
      try {
        localClient = new PrismaClient({
          datasources: {
            db: {
              url: 'mysql://root:bala30012006@localhost:3306/ramchin_smart_school_local',
            },
          },
        });
      } catch (error) {
        console.warn('Failed to initialize local database:', error);
      }
    }

    return {
      type: localClient ? (platform === 'desktop' ? 'desktop-local' : 'web-local') : 'cloud',
      cloudClient,
      localClient,
      isLocalAvailable: !!localClient,
      platform,
    };
  }

  private detectPlatform(): 'mobile' | 'desktop' | 'web' | 'unknown' {
    const isDesktop = process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux';
    if (isDesktop) return 'desktop';
    return 'unknown';
  }

  private checkLocalDatabaseAvailability(): boolean {
    const isDesktop = process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux';
    return isDesktop;
  }

  // ─── Background Jobs ──────────────────────────────────────────────

  private startBackgroundJobs() {
    if (!this.config.localClient) return;

    // Check cloud connectivity every 30 seconds
    this.connectivityInterval = setInterval(() => this.checkCloudConnectivity(), 30000);

    // Retry pending writes every 60 seconds
    this.syncInterval = setInterval(() => this.syncPendingToCloud(), 60000);

    // Initial connectivity check
    this.checkCloudConnectivity();
  }

  private async checkCloudConnectivity(): Promise<void> {
    const wasOnline = this.isCloudOnline;
    try {
      await this.config.cloudClient.$queryRaw`SELECT 1`;
      this.isCloudOnline = true;

      if (!wasOnline) {
        this.logger.log('Cloud connection RESTORED - syncing pending records...');
        this.syncPendingToCloud();
      }
    } catch {
      this.isCloudOnline = false;
      if (wasOnline) {
        this.logger.warn('Cloud connection LOST - working in offline mode (local only)');
      }
    }
  }

  // ─── Dual-Write Proxy ─────────────────────────────────────────────

  /**
   * Wraps the local PrismaClient with a Proxy:
   * - READS:   use CLOUD if online, LOCAL if offline
   * - WRITES:  always to LOCAL, then CLOUD if online (or queued if offline)
   */
  private createDualWriteProxy(): PrismaClient {
    if (this.dualWriteProxy) return this.dualWriteProxy;

    const localClient = this.config.localClient!;
    const cloudClient = this.config.cloudClient;
    const logger = this.logger;
    const self = this;

    this.dualWriteProxy = new Proxy(localClient, {
      get(target: any, prop: string | symbol) {
        const localValue = target[prop];

        // Skip internal Prisma properties ($connect, _engine, etc.)
        if (
          typeof prop === 'symbol' ||
          (typeof prop === 'string' && (prop.startsWith('$') || prop.startsWith('_')))
        ) {
          return localValue;
        }

        // If the property is a model delegate (has findMany, create, etc.), wrap it
        if (localValue && typeof localValue === 'object') {
          return new Proxy(localValue, {
            get(modelTarget: any, methodName: string | symbol) {
              const localMethod = modelTarget[methodName];

              if (typeof methodName !== 'string' || typeof localMethod !== 'function') {
                return localMethod;
              }

              // ─── READ OPERATIONS ─────────────────────────────────────────
              if (READ_METHODS.has(methodName)) {
                return async (...args: any[]) => {
                  if (self.isCloudOnline) {
                    try {
                      const cloudModel = (cloudClient as any)[prop as string];
                      if (cloudModel && typeof cloudModel[methodName] === 'function') {
                        return await cloudModel[methodName](...args);
                      }
                    } catch (cloudError: any) {
                      const isConnError = self.isConnectivityError(cloudError);
                      const shortMsg = isConnError ? 'Database unreachable' : (cloudError.message?.split('\n')[0] || 'Unknown error');
                      logger.warn(`Cloud read failed, falling back to local: ${String(prop)}.${methodName}: ${shortMsg}`);
                      if (isConnError) {
                        self.isCloudOnline = false;
                      }
                    }
                  }
                  // Fallback to local for reads if offline or cloud failed
                  return await localMethod.apply(modelTarget, args);
                };
              }

              // ─── WRITE OPERATIONS ────────────────────────────────────────
              if (WRITE_METHODS.has(methodName)) {
                return async (...args: any[]) => {
                  // 1. Always write to LOCAL first (primary local mirror)
                  const result = await localMethod.apply(modelTarget, args);

                  // 2. Try to write to CLOUD
                  if (self.isCloudOnline) {
                    try {
                      const cloudModel = (cloudClient as any)[prop as string];
                      if (cloudModel && typeof cloudModel[methodName] === 'function') {
                        await cloudModel[methodName](...args);
                        logger.debug(
                          'Cloud sync OK: ' + String(prop) + '.' + methodName,
                        );
                      }
                    } catch (cloudError: any) {
                      logger.warn(
                        'Cloud write failed: ' + String(prop) + '.' + methodName + ': ' + cloudError.message,
                      );
                      // Queue for retry
                      self.queuePendingWrite(String(prop), String(methodName), args);
                      // Mark as offline if it is a connectivity error
                      if (self.isConnectivityError(cloudError)) {
                        self.isCloudOnline = false;
                        logger.warn('Cloud connection LOST - switching to offline mode');
                      }
                    }
                  } else {
                    // Offline - queue for later sync
                    self.queuePendingWrite(String(prop), String(methodName), args);
                    logger.debug(
                      'Offline: queued ' + String(prop) + '.' + methodName + ' for later cloud sync',
                    );
                  }

                  return result;
                };
              }

              return localMethod;
            },
          });
        }

        return localValue;
      },
    }) as PrismaClient;

    this.logger.log('Dual-write proxy created: READ/WRITE switching active');
    return this.dualWriteProxy;
  }

  // ─── Pending Write Queue ──────────────────────────────────────────

  private queuePendingWrite(tableName: string, methodName: string, args: any[]) {
    this.pendingWrites.push({
      tableName,
      methodName,
      args,
      timestamp: new Date(),
      retryCount: 0,
    });
  }

  private isConnectivityError(error: any): boolean {
    const msg = (error.message || '').toLowerCase();
    return (
      msg.includes('connect') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('socket') ||
      msg.includes('reach') ||
      msg.includes('can\'t')
    );
  }

  /**
   * Sync all pending writes to cloud.
   * Called every 60s and immediately when network is restored.
   */
  private async syncPendingToCloud(): Promise<void> {
    if (!this.isCloudOnline || this.isSyncing) return;
    if (this.pendingWrites.length === 0) return;

    this.isSyncing = true;
    const cloudClient = this.config.cloudClient;
    const toRetry: PendingWrite[] = [];
    let synced = 0;
    let failed = 0;

    this.logger.log('Syncing ' + this.pendingWrites.length + ' pending writes to cloud...');

    for (const pw of this.pendingWrites) {
      try {
        const cloudModel = (cloudClient as any)[pw.tableName];
        if (cloudModel && typeof cloudModel[pw.methodName] === 'function') {
          await cloudModel[pw.methodName](...pw.args);
          synced++;
        }
      } catch (error: any) {
        pw.retryCount++;
        if (pw.retryCount < 5) {
          toRetry.push(pw);
        } else {
          this.logger.error(
            'Gave up on ' + pw.tableName + '.' + pw.methodName + ' after 5 retries: ' + error.message,
          );
        }
        failed++;

        // If connectivity error, stop trying the rest
        if (this.isConnectivityError(error)) {
          this.isCloudOnline = false;
          const idx = this.pendingWrites.indexOf(pw);
          const remaining = this.pendingWrites.slice(idx + 1);
          toRetry.push(...remaining);
          break;
        }
      }
    }

    this.pendingWrites = toRetry;
    this.isSyncing = false;

    if (synced > 0 || failed > 0) {
      this.logger.log(
        'Sync complete: ' + synced + ' synced, ' + failed + ' failed, ' + toRetry.length + ' pending',
      );
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  getConfig(): DatabaseConfig {
    return this.config;
  }

  getCloudClient(): PrismaClient {
    return this.config.cloudClient;
  }

  getLocalClient(): PrismaClient | undefined {
    return this.config.localClient;
  }

  getDatabaseClient(request?: any): PrismaClient {
    // If local database is available, ALWAYS use dual-write proxy
    // This provides offline fallback for ALL platforms (Mobile, Desktop, Web)
    if (this.config.localClient) {
      return this.createDualWriteProxy();
    }

    // Fallback to cloud only if no local DB
    return this.config.cloudClient;
  }


  private detectPlatformFromRequest(request?: any): 'mobile' | 'desktop' | 'web' | 'unknown' {
    // 1. Check for explicit override header (case-insensitive)
    const override = request?.headers?.['x-platform']?.toLowerCase();
    if (override === 'desktop' || override === 'mobile' || override === 'web') {
      return override as 'mobile' | 'desktop' | 'web';
    }

    if (!request?.headers?.['user-agent']) {
      return this.config.platform;
    }

    const userAgent = request.headers['user-agent'].toLowerCase();

    // 2. Define indicators
    const desktopIndicators = [
      'windows nt', 'macintosh', 'linux x86_64', 'ubuntu', 'linux i686',
    ];

    const mobileIndicators = [
      'mobile', 'android', 'iphone', 'ipad', 'ipod',
      'blackberry', 'windows phone', 'palm', 'webos',
    ];

    const webIndicators = [
      'mozilla', 'chrome', 'safari', 'firefox', 'edge',
    ];

    // 3. Prioritize Desktop detection (to avoid classifying Flutter desktop as mobile)
    if (desktopIndicators.some(indicator => userAgent.includes(indicator))) {
      return 'desktop';
    }

    // 4. Check for Mobile
    if (mobileIndicators.some(indicator => userAgent.includes(indicator))) {
      return 'mobile';
    }

    // 5. Check for Web
    if (webIndicators.some(indicator => userAgent.includes(indicator))) {
      return 'web';
    }

    // 6. Fallback for Flutter/Dart
    if (userAgent.includes('flutter') || userAgent.includes('dart') || userAgent.includes('okhttp')) {
      // If it's Flutter/Dart and not specifically matched as mobile, 
      // in a hybrid environment it's more likely to be the desktop app
      // especially since we use custom headers now.
      return 'desktop';
    }

    return 'unknown';
  }

  isHybridMode(): boolean {
    return this.config.type === 'desktop-local' || this.config.type === 'web-local';
  }

  isMobilePlatform(request?: any): boolean {
    const platform = this.detectPlatformFromRequest(request);
    return platform === 'mobile';
  }

  shouldUseLocalDatabase(request?: any): boolean {
    const platform = this.detectPlatformFromRequest(request);
    if (platform === 'mobile') return false;
    return this.config.isLocalAvailable && this.config.localClient !== undefined && (platform === 'desktop' || platform === 'web');
  }

  getSyncStatus() {
    return {
      isCloudOnline: this.isCloudOnline,
      pendingWrites: this.pendingWrites.length,
      isHybridMode: this.isHybridMode(),
    };
  }

  async onModuleDestroy() {
    if (this.connectivityInterval) clearInterval(this.connectivityInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);

    // Try to flush pending writes before shutdown
    if (this.pendingWrites.length > 0 && this.isCloudOnline) {
      this.logger.log('Flushing ' + this.pendingWrites.length + ' pending writes before shutdown...');
      await this.syncPendingToCloud();
    }

    await this.config.cloudClient.$disconnect();
    if (this.config.localClient) {
      await this.config.localClient.$disconnect();
    }
  }
}
