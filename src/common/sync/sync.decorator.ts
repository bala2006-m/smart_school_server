import { SetMetadata } from '@nestjs/common';

export const SyncTable = (tableName: string) => 
  SetMetadata('sync_table', tableName);

export const SyncOperation = (operation: 'create' | 'update' | 'delete') => 
  SetMetadata('sync_operation', operation);

// Combined decorator for convenience
export const EnableSync = (tableName: string, operation: 'create' | 'update' | 'delete') => (
  target: any,
  propertyKey?: string,
  descriptor?: PropertyDescriptor,
) => {
  if (propertyKey !== undefined && descriptor !== undefined) {
    SetMetadata('sync_table', tableName)(target, propertyKey, descriptor);
    SetMetadata('sync_operation', operation)(target, propertyKey, descriptor);
  }
};
