import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateBlockedSchoolDto } from './dto/create-blocked-school.dto';
import { BlockedSchoolModule } from './blocked-school.module';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class BlockedSchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  // ✅ Create Blocked School
  async create(data: CreateBlockedSchoolDto) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).blockedSchool.create({
      data,
      include: { school: true },
    });
  }

  // ✅ Delete Blocked School by ID
  async delete(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const existing = await (client as any).blockedSchool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`BlockedSchool with id ${id} not found`);
    }

    return (client as any).blockedSchool.delete({
      where: { id },
    });
  }

  // Optional: Get all blocked schools
  async findAll() {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).blockedSchool.findMany({
      include: { school: true },
    });
  }

  async isBlocked(schoolId: number): Promise<{ isBlocked: boolean; reason?: string }> {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const blocked = await (client as any).blockedSchool.findUnique({
      where: { school_id: Number(schoolId) },
    });

    if (blocked) {
      return {
        isBlocked: true,
        reason: blocked.reason,
      };
    }

    return { isBlocked: false };
  }
}
