import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @Query('school_id') schoolId: string,
    @Query('date') date: string,
  ) {
    if (!schoolId || !date) {
      return { status: 'error', message: 'Missing school_id or date' };
    }

    return this.dashboardService.getSummary(Number(schoolId), date);
  }
  @Get('class-summary')
  async getClassSummary(
    @Query('school_id') schoolId: string,
    @Query('date') date: string,
  ) {
    if (!schoolId || !date) {
      return { status: 'error', message: 'Missing school_id or date' };
    }

    return this.dashboardService.getClassSummary(Number(schoolId), date);
  }

  @Get('attendance-trends')
  async getAttendanceTrends(
    @Query('school_id') schoolId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('class_id') classId?: string,
  ) {
    if (!schoolId || !startDate || !endDate) {
      return { status: 'error', message: 'Missing required parameters' };
    }

    return this.dashboardService.getAttendanceTrends(Number(schoolId), startDate, endDate, classId ? Number(classId) : undefined);
  }

  @Get('fee-collection-trends')
  async getFeeCollectionTrends(
    @Query('school_id') schoolId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('class_id') classId?: string,
  ) {
    if (!schoolId || !startDate || !endDate) {
      return { status: 'error', message: 'Missing required parameters' };
    }

    return this.dashboardService.getFeeCollectionTrends(Number(schoolId), startDate, endDate, classId ? Number(classId) : undefined);
  }

  @Get('exam-performance-trends')
  async getExamPerformanceTrends(
    @Query('school_id') schoolId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('class_id') classId?: string,
  ) {
    if (!schoolId || !startDate || !endDate) {
      return { status: 'error', message: 'Missing required parameters' };
    }

    return this.dashboardService.getExamPerformanceTrends(Number(schoolId), startDate, endDate, classId ? Number(classId) : undefined);
  }

  @Get('class-comparisons')
  async getClassComparisons(
    @Query('school_id') schoolId: string,
    @Query('date') date: string,
  ) {
    if (!schoolId || !date) {
      return { status: 'error', message: 'Missing school_id or date' };
    }

    return this.dashboardService.getClassComparisons(Number(schoolId), date);
  }

  @Get('predictive-insights')
  async getPredictiveInsights(
    @Query('school_id') schoolId: string,
    @Query('class_id') classId?: string,
  ) {
    if (!schoolId) {
      return { status: 'error', message: 'Missing school_id' };
    }

    return this.dashboardService.getPredictiveInsights(Number(schoolId), classId ? Number(classId) : undefined);
  }

}
