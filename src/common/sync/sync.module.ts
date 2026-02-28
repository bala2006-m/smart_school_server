import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { OfflineFirstService } from './offline-first.service';
import { OfflineFirstController } from './offline-first.controller';
import { OfflineFirstInterceptor } from './offline-first.interceptor';
import { SchoolSyncService } from './school-sync.service';
import { CloudToLocalSyncService } from './cloud-to-local.service';
import { SimpleInitialSyncService } from './simple-initial-sync.service';
import { StartupSyncService } from './startup-sync.service';
import { LoginSyncService } from './login-sync.service';
import { SimpleWebSocketGateway } from '../websocket/simple_websocket.gateway';
import { DatabaseConfigModule } from '../database/database.module';

@Module({
  imports: [DatabaseConfigModule],
  providers: [
    SyncService,
    SimpleWebSocketGateway,
    OfflineFirstService,
    OfflineFirstInterceptor,
    SchoolSyncService,
    CloudToLocalSyncService,
    SimpleInitialSyncService,
    StartupSyncService,
    LoginSyncService,
  ],
  controllers: [SyncController, OfflineFirstController],
  exports: [
    SyncService,
    OfflineFirstService,
    SchoolSyncService,
    CloudToLocalSyncService,
    SimpleInitialSyncService,
    StartupSyncService,
    LoginSyncService,
    SimpleWebSocketGateway,
    OfflineFirstInterceptor
  ],
})
export class SyncModule { }
