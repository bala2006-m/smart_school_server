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
  private readonly compatibilityProxyCache = new WeakMap<object, PrismaClient>();
  private readonly legacyModelAliases: Record<string, string> = {
    academicYear: 'accadamicYear',
    acadamicYear: 'accadamicYear',
    blockedSchool: 'blockedschool',
    busFeePayment: 'busfeepayment',
    busFeeStructure: 'busfeestructure',
    classTimetable: 'classtimetable',
    examMarks: 'exammarks',
    examTimetable: 'examtimetable',
    examTimeTable: 'examtimetable',
    feePayments: 'feepayments',
    feeStructure: 'feestructure',
    imageAndVideos: 'imageandvideos',
    leaveRequest: 'leaverequest',
    rteFeePayment: 'rtefeepayment',
    rteStructure: 'rtestructure',
    staffAttendance: 'staffattendance',
    studentAttendance: 'studentattendance',
    studentFees: 'studentfees',
  };

  // Connectivity & offline sync state
  private isCloudOnline = true;
  private lastCloudIssue: string | null = null;
  private isLocalOnline = false;
  private lastLocalIssue: string | null = null;
  private pendingWrites: PendingWrite[] = [];
  private connectivityInterval: NodeJS.Timeout | null = null;
  private localConnectivityInterval: NodeJS.Timeout | null = null;
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
    // Explicitly check for VPS/Production mode via environment variable
    if (process.env.DATABASE_MODE === 'cloud') {
      return 'web'; // Treat VPS as web platform (no local DB)
    }

    const isDesktop = process.platform === 'win32' || process.platform === 'darwin';
    // On Linux, we only treat as desktop if it's NOT explicitly marked as cloud mode
    // Most VPS are Linux, but some devs use Linux desktop.
    if (process.platform === 'linux' && process.env.DATABASE_MODE !== 'local') {
      return 'web'; // Default Linux to web/server mode unless specified
    }

    if (isDesktop) return 'desktop';
    return 'unknown';
  }

  private checkLocalDatabaseAvailability(): boolean {
    // If explicitly set to cloud mode, local is NOT available
    if (process.env.DATABASE_MODE === 'cloud') return false;
    
    // If explicitly set to local mode, allow it
    if (process.env.DATABASE_MODE === 'local') return true;

    const isDesktop = process.platform === 'win32' || process.platform === 'darwin';
    // Default Linux to false (server) unless DATABASE_MODE=local is set
    return isDesktop;
  }

  private getErrorSummary(error: any): string {
    if (!error) return 'Empty error object';
    if (typeof error === 'string') return error;

    const parts: string[] = [];
    const message =
      typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message.split('\n')[0]
        : '';

    if (message) parts.push(message);
    if (error.name) parts.push(`name=${error.name}`);
    if (error.code) parts.push(`code=${error.code}`);
    if (error.errorCode) parts.push(`errorCode=${error.errorCode}`);
    if (error.clientVersion) parts.push(`clientVersion=${error.clientVersion}`);
    if (error.meta) {
      try {
        parts.push(`meta=${JSON.stringify(error.meta)}`);
      } catch {
        parts.push('meta=[unserializable]');
      }
    }

    if (parts.length > 0) return parts.join(' | ');

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // ─── Background Jobs ──────────────────────────────────────────────

  private startBackgroundJobs() {
    // Always keep cloud status fresh.
    this.connectivityInterval = setInterval(() => this.checkCloudConnectivity(), 30000);
    this.checkCloudConnectivity();

    if (!this.config.localClient) {
      this.isLocalOnline = false;
      this.lastLocalIssue = 'Local database client is not configured';
      return;
    }

    // Keep local status fresh to decide between dual-write and cloud-only modes.
    this.localConnectivityInterval = setInterval(() => this.checkLocalConnectivity(), 30000);
    this.checkLocalConnectivity();

    // Retry pending writes every 60 seconds (only meaningful when local mirror exists).
    this.syncInterval = setInterval(() => this.syncPendingToCloud(), 60000);
  }

  private async checkCloudConnectivity(): Promise<void> {
    const wasOnline = this.isCloudOnline;
    try {
      // Validate connectivity and Prisma schema mapping for the cloud datasource.
      await this.config.cloudClient.school.findFirst({
        select: { id: true },
      });
      this.isCloudOnline = true;
      this.lastCloudIssue = null;

      if (!wasOnline) {
        this.logger.log('Cloud connection RESTORED - syncing pending records...');
        this.syncPendingToCloud();
      }
    } catch (error: any) {
      this.isCloudOnline = false;
      this.lastCloudIssue = this.getErrorSummary(error);
      if (wasOnline) {
        this.logger.warn(`Cloud connection/schema unavailable - working in offline mode (local only). Reason: ${this.lastCloudIssue}`);
      }
    }
  }

  private async checkLocalConnectivity(): Promise<void> {
    if (!this.config.localClient) {
      this.isLocalOnline = false;
      this.lastLocalIssue = 'Local database client is not configured';
      return;
    }

    const wasOnline = this.isLocalOnline;
    try {
      await this.config.localClient.$queryRawUnsafe('SELECT 1');
      this.isLocalOnline = true;
      this.lastLocalIssue = null;

      if (!wasOnline) {
        this.logger.log('Local database connection AVAILABLE - enabling bidirectional sync mode');
      }
    } catch (error: any) {
      this.isLocalOnline = false;
      this.lastLocalIssue = this.getErrorSummary(error);
      if (wasOnline) {
        this.logger.warn(`Local database unavailable - switching to cloud-only mode. Reason: ${this.lastLocalIssue}`);
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
          // Intercept raw queries to preserve Cloud/Local fallback logic
          if (prop === '$queryRaw' || prop === '$queryRawUnsafe') {
            return async (...args: any[]) => {
              if (self.isCloudOnline) {
                try {
                  return await (cloudClient as any)[prop](...args);
                } catch (cloudError: any) {
                  const isCloudUnavailable = self.isCloudUnavailableError(cloudError);
                  const errorSummary = self.getErrorSummary(cloudError);
                  const shortMsg = isCloudUnavailable
                    ? `Database unreachable or schema unavailable: ${errorSummary}`
                    : errorSummary;
                  logger.warn(`Cloud raw query failed, falling back to local: ${String(prop)}: ${shortMsg}`);
                  if (isCloudUnavailable) {
                    self.isCloudOnline = false;
                    self.lastCloudIssue = errorSummary;
                  }
                }
              }
              return await (localClient as any)[prop](...args);
            };
          }

          if (prop === '$executeRaw' || prop === '$executeRawUnsafe') {
            return async (...args: any[]) => {
              const result = await (localClient as any)[prop](...args);
              if (self.isCloudOnline) {
                try {
                  await (cloudClient as any)[prop](...args);
                  logger.debug(`Cloud sync OK: ${String(prop)}`);
                } catch (cloudError: any) {
                  logger.warn(`Cloud raw execute failed: ${String(prop)}: ${self.getErrorSummary(cloudError)}`);
                  // Note: Queueing raw executes is hard because arguments might contain complex templating,
                  // but we queue it anyway and hope the arguments survive serialization if needed.
                  self.queuePendingWrite('$prisma', String(prop), args);
                  if (self.isCloudUnavailableError(cloudError)) {
                    self.isCloudOnline = false;
                    self.lastCloudIssue = self.getErrorSummary(cloudError);
                    logger.warn('Cloud connection LOST - switching to offline mode');
                  }
                }
              } else {
                self.queuePendingWrite('$prisma', String(prop), args);
              }
              return result;
            };
          }

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
                      const isCloudUnavailable = self.isCloudUnavailableError(cloudError);
                      const errorSummary = self.getErrorSummary(cloudError);
                      const shortMsg = isCloudUnavailable
                        ? `Database unreachable or schema unavailable: ${errorSummary}`
                        : errorSummary;
                      logger.warn(`Cloud read failed, falling back to local: ${String(prop)}.${methodName}: ${shortMsg}`);
                      if (isCloudUnavailable) {
                        self.isCloudOnline = false;
                        self.lastCloudIssue = errorSummary;
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
                        'Cloud write failed: ' + String(prop) + '.' + methodName + ': ' + self.getErrorSummary(cloudError),
                      );
                      // Queue for retry
                      self.queuePendingWrite(String(prop), String(methodName), args);
                      // Mark as offline if it is a connectivity error
                      if (self.isCloudUnavailableError(cloudError)) {
                        self.isCloudOnline = false;
                        self.lastCloudIssue = self.getErrorSummary(cloudError);
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

  private isSchemaError(error: any): boolean {
    const code = String(error?.code || '');
    const msg = String(error?.message || '').toLowerCase();
    return (
      code === 'P2021' ||
      code === 'P2022' ||
      msg.includes('table') && msg.includes('does not exist') ||
      msg.includes('unknown table') ||
      msg.includes('column') && msg.includes('does not exist')
    );
  }

  private isCloudUnavailableError(error: any): boolean {
    return this.isConnectivityError(error) || this.isSchemaError(error);
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
        if (pw.tableName === '$prisma') {
          const rawMethod = (cloudClient as any)[pw.methodName];
          if (typeof rawMethod === 'function') {
            await rawMethod.apply(cloudClient, pw.args);
            synced++;
          }
        } else {
          const cloudModel = (cloudClient as any)[pw.tableName];
          if (cloudModel && typeof cloudModel[pw.methodName] === 'function') {
            await cloudModel[pw.methodName](...pw.args);
            synced++;
          }
        }
      } catch (error: any) {
        pw.retryCount++;
        if (pw.retryCount < 5) {
          toRetry.push(pw);
        } else {
          this.logger.error(
            'Gave up on ' + pw.tableName + '.' + pw.methodName + ' after 5 retries: ' + this.getErrorSummary(error),
          );
        }
        failed++;

        // If cloud is unavailable (network/schema), stop trying the rest
        if (this.isCloudUnavailableError(error)) {
          this.isCloudOnline = false;
          this.lastCloudIssue = this.getErrorSummary(error);
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

  private withLegacyModelAliases<T extends PrismaClient | undefined>(client: T): T {
    if (!client) return client;

    const cachedProxy = this.compatibilityProxyCache.get(client as unknown as object);
    if (cachedProxy) return cachedProxy as T;

    const aliasMap = this.legacyModelAliases;
    const proxy = new Proxy(client as any, {
      get(target: any, prop: string | symbol, receiver: any) {
        const directValue = Reflect.get(target, prop, receiver);
        if (directValue !== undefined || typeof prop !== 'string') {
          return directValue;
        }

        const alias = aliasMap[prop];
        if (!alias) {
          return directValue;
        }

        const mappedValue = Reflect.get(target, alias, receiver);
        if (mappedValue !== undefined) {
          return mappedValue;
        }

        return directValue;
      },
    });

    this.compatibilityProxyCache.set(client as unknown as object, proxy as PrismaClient);
    return proxy as T;
  }

  // ─── Public API ───────────────────────────────────────────────────

  getConfig(): DatabaseConfig {
    return this.config;
  }

  getCloudClient(): PrismaClient {
    return this.withLegacyModelAliases(this.config.cloudClient)!;
  }

  getLocalClient(): PrismaClient | undefined {
    return this.withLegacyModelAliases(this.config.localClient);
  }

  getDatabaseClient(request?: any): PrismaClient {
    // Use bidirectional mode only when local DB is configured and currently reachable.
    if (this.config.localClient && this.isLocalOnline) {
      return this.withLegacyModelAliases(this.createDualWriteProxy())!;
    }

    // Cloud-only mode when local is unavailable or not configured.
    return this.withLegacyModelAliases(this.config.cloudClient)!;
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
    return !!this.config.localClient && this.isLocalOnline;
  }

  isMobilePlatform(request?: any): boolean {
    const platform = this.detectPlatformFromRequest(request);
    return platform === 'mobile';
  }

  shouldUseLocalDatabase(request?: any): boolean {
    const platform = this.detectPlatformFromRequest(request);
    if (platform === 'mobile') return false;
    return (
      this.config.isLocalAvailable &&
      this.config.localClient !== undefined &&
      this.isLocalOnline &&
      (platform === 'desktop' || platform === 'web')
    );
  }

  getSyncStatus() {
    return {
      isCloudOnline: this.isCloudOnline,
      lastCloudIssue: this.lastCloudIssue,
      isLocalOnline: this.isLocalOnline,
      lastLocalIssue: this.lastLocalIssue,
      pendingWrites: this.pendingWrites.length,
      isHybridMode: this.isHybridMode(),
    };
  }

  async onModuleDestroy() {
    if (this.connectivityInterval) clearInterval(this.connectivityInterval);
    if (this.localConnectivityInterval) clearInterval(this.localConnectivityInterval);
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
