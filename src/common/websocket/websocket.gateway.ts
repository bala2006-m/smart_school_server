import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';

@WSGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  constructor(private readonly syncService: SyncService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send current sync status to newly connected client
    this.sendSyncStatus(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe-sync')
  handleSubscribeSync(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} subscribed to sync updates`);
    client.join('sync-updates');
    
    // Send initial sync status
    this.sendSyncStatus(client);
  }

  @SubscribeMessage('get-sync-status')
  handleGetSyncStatus(@ConnectedSocket() client: Socket) {
    this.sendSyncStatus(client);
  }

  @SubscribeMessage('trigger-full-sync')
  async handleTriggerFullSync(@ConnectedSocket() client: Socket) {
    try {
      await this.syncService.syncAllData();
      
      client.emit('sync-triggered', {
        status: 'success',
        message: 'Full synchronization completed',
        timestamp: new Date().toISOString(),
      });

      // Broadcast updated status to all subscribed clients
      this.broadcastSyncStatus();
    } catch (error) {
      client.emit('sync-triggered', {
        status: 'error',
        message: 'Synchronization failed: ' + error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Method to broadcast sync updates to all connected clients
  broadcastSyncUpdate(data: any) {
    this.server.to('sync-updates').emit('sync-update', {
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted sync update: ${data.operation} on ${data.tableName}`);
  }

  // Method to broadcast sync status
  broadcastSyncStatus() {
    const status = this.syncService.getSyncStatus();
    
    this.server.to('sync-updates').emit('sync-status', {
      ...status,
      timestamp: new Date().toISOString(),
    });
  }

  // Send sync status to specific client
  private sendSyncStatus(client: Socket) {
    const status = this.syncService.getSyncStatus();
    
    client.emit('sync-status', {
      ...status,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify clients about database changes
  notifyDatabaseChange(tableName: string, operation: string, data: any) {
    this.broadcastSyncUpdate({
      tableName,
      operation,
      data,
      type: 'database-change',
    });
  }

  // Get count of connected clients
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
