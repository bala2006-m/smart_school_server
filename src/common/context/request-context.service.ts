import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  academicStart?: Date;
  academicEnd?: Date;
  academicId?: number;
}

@Injectable()
export class RequestContextService {
  private static storage = new AsyncLocalStorage<RequestContextStore>();

  static run(store: RequestContextStore, callback: () => void) {
    this.storage.run(store, callback);
  }

  static getStore(): RequestContextStore | undefined {
    return this.storage.getStore();
  }

  static get academicStart(): Date | undefined {
    return this.storage.getStore()?.academicStart;
  }

  static get academicEnd(): Date | undefined {
    return this.storage.getStore()?.academicEnd;
  }

  static get academicId(): number | undefined {
    return this.storage.getStore()?.academicId;
  }
}
