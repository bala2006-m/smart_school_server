import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  date: string;

  @IsString()
  reason: string;

  @IsNumber()
  school_id: number;

  @IsArray()
  class_ids: number[];

  @IsEnum(['H', 'W'])
  fn: 'H' | 'W';

  @IsEnum(['H', 'W'])
  an: 'H' | 'W';
}
