import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SyncService } from './sync.service';
import { SimpleWebSocketGateway } from '../websocket/simple_websocket.gateway';
import { Reflector } from '@nestjs/core';

export const SYNC_TABLE_KEY = 'sync_table';
export const SYNC_OPERATION_KEY = 'sync_operation';

@Injectable()
export class SyncInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SyncInterceptor.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly websocketGateway: SimpleWebSocketGateway,
    private readonly reflector: Reflector,
  ) {}

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
              await this.handleSync(request, syncTable, syncOperation, response);
            }
          } catch (error) {
            this.logger.error('Error in sync interceptor:', error);
          }
        },
        error: (error) => {
          this.logger.error('Request failed, skipping sync:', error);
        },
      }),
    );
  }

  private async handleSync(
    request: any,
    tableName: string,
    operation: string,
    response: any,
  ): Promise<void> {
    try {
      // Determine the source based on the request
      const source = this.determineSource(request);
      
      // Extract relevant data from the request/response
      const data = this.extractSyncData(request, response, operation);

      if (data) {
        // Add to sync queue
        await this.syncService.addToSyncQueue({
          tableName,
          operation: operation as 'create' | 'update' | 'delete',
          data,
          source,
        });

        // Broadcast real-time update to connected clients
        this.websocketGateway.notifyDatabaseChange(tableName, operation, data);

        // Broadcast updated sync status
        this.websocketGateway.broadcastSyncStatus();

        this.logger.log(`Sync queued for ${tableName} - ${operation} from ${source}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle sync:', error);
    }
  }

  private determineSource(request: any): 'cloud' | 'local' {
    // You can customize this logic based on your needs
    // For example, check headers, request origin, or other indicators
    
    // If the request has a specific header indicating it's from local
    if (request.headers['x-sync-source'] === 'local') {
      return 'local';
    }
    
    // Default to cloud
    return 'cloud';
  }

  private extractSyncData(request: any, response: any, operation: string): any {
    switch (operation) {
      case 'create':
      case 'update':
        // For create/update, use the response data or request body
        return response.data || response || request.body;
      
      case 'delete':
        // For delete, use the request parameters or body
        return {
          id: request.params.id || request.body.id,
          ...request.body,
        };
      
      default:
        return null;
    }
  }
}
