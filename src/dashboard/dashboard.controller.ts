import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @Query('school_id') schoolId: number,
    @Query('date') date: string,
  ) {
    if (!schoolId || !date) {
      return { status: 'error', message: 'Missing school_id or date' };
    }

    return this.dashboardService.getSummary(schoolId, date);
  }
  @Get('class-summary')
  async getClassSummary(
    @Query('school_id') schoolId: number,
    @Query('date') date: string,
  ) {
    if (!schoolId || !date) {
      return { status: 'error', message: 'Missing school_id or date' };
    }

    return this.dashboardService.getClassSummary(schoolId, date);
  }

}
