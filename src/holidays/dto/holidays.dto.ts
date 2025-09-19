// holidays.dto.ts
import { IsString } from 'class-validator';

export class GetHolidaysByClassDto {
  @IsString()
  school_id: string;

  @IsString()
  class_id: string;
}
