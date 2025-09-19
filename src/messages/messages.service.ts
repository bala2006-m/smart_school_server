import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getLastMessageBySchoolId(schoolId: number) {
    return this.prisma.messages.findFirst({
      where: { school_id: schoolId },
      orderBy: {
        id: 'desc',
      },
    });
  }
  async postMessage(message: string, school_id: number) {
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


    const newMessage = await this.prisma.messages.create({
      data: {
        messages: message,
        school_id: school_id,
        date: formattedDateTime,
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

