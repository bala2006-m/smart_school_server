import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateHomeworkDto {
  @IsInt()
  school_id: number;

  @IsInt()
  class_id: number;

  @IsString()
  title: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsDateString()
  assigned_date: Date;

  @IsDateString()
  due_date: Date;

  @IsString()
  assigned_by: string;

  @IsOptional()
  @IsString()
  attachments?: string;
}
