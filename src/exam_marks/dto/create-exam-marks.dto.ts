import { IsInt, IsString, IsOptional, IsJSON } from 'class-validator';

export class CreateExamMarkDto {
  @IsInt()
  school_id: number;

  @IsInt()
  class_id: number;

  @IsString()
  username: string;

  @IsString()
  title: string;

  @IsJSON()
  min_max_marks: any;

  @IsJSON()
  marks: any;

  @IsJSON()
  subjects: any;

  @IsJSON()
  subject_rank: any;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsString()
  created_by: string;

  @IsString()
  updated_by: string;

  @IsString()
  date:string

  @IsString()
  session:string
}
