import { Body, Controller, Post, Get, Query } from '@nestjs/common';
import { FeedbackService,TicketsService } from './feedback.service'; // adjust path accordingly

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async storeFeedback(@Body() body: any) {
    const { name,username, email, feedback, schoolId, classId } = body;

    // Delegate creation to feedbackService
    const newFeedback = await this.feedbackService.createFeedback({
      name,
      username,
      email,
      feedback,
      school_id: parseInt(schoolId, 10),
      class_id: parseInt(classId, 10),
    });

    return { status: 'success', data: newFeedback };
  }

  @Get('list')
  async getFeedbacks(
    @Query('school_id') school_id?: number,
  ) {
    if (!school_id) {
      throw new Error('school_id query parameter is required');
    }

    return this.feedbackService.getFeedbackBySchool({school_id});
  }
}
//parthi Add.
@Controller('Tickets')
export class TicketsController {
  constructor(private readonly TicketsService: TicketsService) {}

  @Post('post')
  async storeTickets(@Body() body: any) {
    const { username, name, email, tickets, schoolId } = body;

    // Delegate creation to feedbackService
    const newTickets = await this.TicketsService.createTickets({
      username,
      name,
      email,
      tickets,
      school_id: parseInt(schoolId),
    });

    return { status: 'success', data: newTickets };
  }

  @Get('list')
  async getTickets(
    @Query('school_id') school_id?: number,
  ) {
    if (!school_id) {
      throw new Error('school_id query parameter is required');
    }

    return this.TicketsService.getTicketsBySchool({school_id});
  }
}
