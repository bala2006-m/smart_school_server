import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async getAllBySchoolId(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).messages.findMany({
      where: { school_id: schoolId },
      orderBy: {
        id: 'desc',
      },
    });
  }
  async delete(id: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).messages.delete({
      where: { id }
    });
  }
  async getLastMessageBySchoolId(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).messages.findFirst({
      where: { school_id: schoolId },
      orderBy: {
        id: 'desc',
      },
    });
  }
  async getLastMessageBySchoolIdRole(schoolId: number, role: string) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).messages.findFirst({
      where: { school_id: schoolId, role },
      orderBy: {
        id: 'desc',
      },
    });
  }
  async postMessage(message: string, school_id: number, role: string) {
    try {
      const currentDate = new Date();

      // Extract components
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month (01-12)
      const day = String(currentDate.getDate()).padStart(2, '0');        // Day (01-31)
      const hours = String(currentDate.getHours()).padStart(2, '0');     // Hours (00-23)
      const minutes = String(currentDate.getMinutes()).padStart(2, '0'); // Minutes (00-59)

      // Format: YYYY-MM-DD HH:mm
      const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;



      const client = this.dbConfig.getDatabaseClient(this.request);

      const newMessage = await (client as any).messages.create({
        data: {
          messages: message,
          school_id: school_id,
          date: formattedDateTime,
          role: role
        },
      });

      return {
        status: 'success',
        message: 'Message added successfully',
        data: {
          message: newMessage.messages,
          school_id: newMessage.school_id,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Add failed: ' + error.message);
    }
  }

}

