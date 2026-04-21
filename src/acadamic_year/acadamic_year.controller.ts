import { Controller, Get, Param,  } from '@nestjs/common';
import { AcadamicYearService } from './acadamic_year.service';
 
 
@Controller('acadamic_year')
export class AcadamicYearController {
  constructor(private acadamicYearService: AcadamicYearService) {}
  @Get('fetch_all/:school_id')
  
  async fetchAdminAndSchoolData(@Param('school_id') school_id:string) {
     
    try {
      const data = await this.acadamicYearService.fetchAll(Number(school_id));
      return {
        status: 'success',
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error,
      };
    }
  }
    
  @Get('fetch_last/:school_id')
  async fetchLastAcadamicYear(@Param('school_id') school_id:string) {
     
    try {
      const data = await this.acadamicYearService.fetchLast(Number(school_id));
      return {
        status: 'success',
        data,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error,
      };
    }
  }
}