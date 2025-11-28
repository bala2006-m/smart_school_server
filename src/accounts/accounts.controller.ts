import { Controller, Get, Param, Patch, Body,Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';


@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}
  @Get('fetch_all/:school_id')
  async fetchAdminAndSchoolData(@Param('school_id') school_id:string) {
    try {
      const data = await this.accountsService.fetchAll(Number(school_id));
      return {
        status: 'success',
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
   @Get('fetch_all_periodical/:school_id/:from/:to')
  async fetchAdminAndSchool(@Param('school_id') school_id:string,@Param('from') from:Date,@Param('to') to:Date) {
    try {
      const data = await this.accountsService.fetchAllPeriodical(Number(school_id),new Date(from),new Date(to));
      return {
        status: 'success',
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
