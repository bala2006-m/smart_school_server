import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';
import { log } from 'console';

@Injectable()
export class AcadamicYearService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async fetchAll(school_id?: number) {
     
    const client = this.dbConfig.getDatabaseClient(this.request);
    const whereClause =
      school_id !== undefined && !Number.isNaN(Number(school_id))
        ? { school_id: Number(school_id) }
        : undefined;

    const acadamic = await (client as any).accadamicYear.findMany({
      where: whereClause,
    });
    
    return acadamic;
   
  }
  
    async fetchLast(school_id?: number) {
     
    const client = this.dbConfig.getDatabaseClient(this.request);
    const whereClause =
      school_id !== undefined && !Number.isNaN(Number(school_id))
        ? { school_id: Number(school_id) }
        : undefined;

    const acadamic = await (client as any).accadamicYear.findLast({
      where: whereClause,
    });
    
    return acadamic;
   
  }
}
