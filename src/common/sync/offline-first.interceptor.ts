import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { OfflineFirstService } from './offline-first.service';
import { SimpleWebSocketGateway } from '../websocket/simple_websocket.gateway';
import { Reflector } from '@nestjs/core';

export const SYNC_TABLE_KEY = 'sync_table';
export const SYNC_OPERATION_KEY = 'sync_operation';

@Injectable()
export class OfflineFirstInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OfflineFirstInterceptor.name);

  constructor(
    private readonly offlineFirstService: OfflineFirstService,
    private readonly websocketGateway: SimpleWebSocketGateway,
    private readonly reflector: Reflector,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Get sync metadata from the handler
    const syncTable = this.reflector.get<string>(SYNC_TABLE_KEY, context.getHandler());
    const syncOperation = this.reflector.get<string>(SYNC_OPERATION_KEY, context.getHandler());

    // Only proceed if sync metadata is present
    if (!syncTable || !syncOperation) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // Check if the operation was successful
            if (response && (response.status === 'success' || response.statusCode === 200 || response.statusCode === 201)) {
              await this.handleOfflineFirstSync(request, syncTable, syncOperation, response);
            }
          } catch (error) {
            this.logger.error('Error in offline-first interceptor:', error);
          }
        },
        error: (error) => {
          this.logger.error('Request failed, skipping sync:', error);
        },
      }),
    );
  }

  private async handleOfflineFirstSync(
    request: any,
    tableName: string,
    operation: string,
    response: any,
  ): Promise<void> {
    try {
      // Determine the source and strategy based on request
      const source = this.determineSource(request);
      const data = this.extractSyncData(request, response, operation);

      if (!data) {
        return;
      }

      if (source === 'local') {
        // Desktop user - Service already stored it locally
        // We only need to queue for cloud sync
        await this.offlineFirstService.queueForCloudSync(
          tableName,
          operation as 'create' | 'update' | 'delete',
          data,
        );

        this.logger.log(`Desktop operation: Queued for cloud sync - ${tableName} - ${operation}`);
      } else {
        // Mobile user or Cloud user - Service already stored it in cloud
        // We only need to queue for local sync (if local DB exists)
        const isHybridMode = this.offlineFirstService.isDesktopOfflineMode();
        if (isHybridMode) {
          await this.offlineFirstService.syncService.addToSyncQueue({
            tableName,
            operation: operation as 'create' | 'update' | 'delete',
            data,
            source: 'cloud', // Coming from cloud, target is local
          });
          this.logger.log(`Cloud operation: Queued for local sync - ${tableName} - ${operation}`);
        } else {
          this.logger.log(`Mobile operation: Stored in cloud only - ${tableName} - ${operation}`);
        }
      }

      // Broadcast real-time update to all connected clients
      this.websocketGateway.notifyDatabaseChange(tableName, operation, data);

    } catch (error) {
      this.logger.error('Failed to handle offline-first sync:', error);
    }
  }

  private determineSource(request: any): 'local' | 'cloud' {
    // Check if request came from local desktop client
    if (request.headers['x-sync-source'] === 'local') {
      return 'local';
    }

    // Check if request came from web interface on desktop
    const userAgent = request.headers['user-agent']?.toLowerCase() || '';
    const referer = request.headers['referer']?.toLowerCase() || '';

    // Check if we're in hybrid mode (local server available)
    const isHybridMode = this.offlineFirstService.isDesktopOfflineMode();

    // If we're in hybrid mode and this is from a desktop browser, treat as local
    if (isHybridMode && (
      userAgent.includes('windows') ||
      userAgent.includes('macintosh') ||
      userAgent.includes('linux') ||
      userAgent.includes('chrome') ||
      userAgent.includes('firefox') ||
      userAgent.includes('safari') ||
      userAgent.includes('edge')
    )) {
      return 'local';
    }

    // Default to cloud for mobile
    return 'cloud';
  }

  private extractSyncData(request: any, response: any, operation: string): any {
    switch (operation) {
      case 'create':
      case 'update':
        // For create/update, use response data or request body
        let data = response.data || response || request.body;

        // Special handling for Messages table - map 'message' to 'messages'
        if (data && data.message && !data.messages) {
          data = {
            ...data,
            messages: data.message,
            message: undefined, // Remove the singular field
          };
        }

        return data;

      case 'delete':
        // For delete, use request parameters or body
        return {
          id: request.params.id || request.body.id,
          ...request.body,
        };

      default:
        return null;
    }
  }
}
