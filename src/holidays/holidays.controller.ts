import { Controller,Post, Body, HttpCode, Get, Query, UsePipes, ValidationPipe ,BadRequestException} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { GetHolidaysByClassDto } from './dto/holidays.dto';
import { DeleteHolidayDto } from './dto/delete-holiday.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}
   @Post('add_holiday')
    addHoliday(@Body() dto: CreateHolidayDto) {
      return this.holidaysService.addHoliday(dto);
    }
  @Get('class')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getByClass(@Query() query: GetHolidaysByClassDto) {
    const { school_id, class_id } = query;
    return this.holidaysService.getHolidaysByClass(school_id, class_id);
  }
   @Get('fetch')
    async fetchHolidays(@Query('school_id') school_id: string) {
      if (!school_id) {
        throw new BadRequestException('Missing required parameter: school_id');
      }

      return this.holidaysService.fetchHolidays(school_id);
    }
@Post('/delete_holiday')
  @HttpCode(200)
  deleteHoliday(@Body() dto: DeleteHolidayDto) {
    return this.holidaysService.deleteHoliday(dto);
  }
}
