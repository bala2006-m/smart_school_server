import { 
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray 
} from 'class-validator';

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

  // Must be string because DTO receives it as a text date
  @IsDateString()
  assigned_date: string;

  @IsDateString()
  due_date: string;

  @IsString()
  assigned_by: string;

  // optional when creating homework without file
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
