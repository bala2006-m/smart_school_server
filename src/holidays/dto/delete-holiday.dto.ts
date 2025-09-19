import { IsNotEmpty, IsInt, IsDateString } from 'class-validator';

export class DeleteHolidayDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsInt()
  @IsNotEmpty()
  school_id: number;
}
