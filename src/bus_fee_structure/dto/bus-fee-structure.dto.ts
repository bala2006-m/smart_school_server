import { studentfees_status } from '@prisma/client';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
 
export class CreateBusFeeStructureDto {
  @IsNumber()
  school_id: number;

  @IsString()
  route: string;

  @IsString()
  term: string;

  @IsNumber()
  amount_month: number;

  @IsNumber()
  total_amount: number;

  @IsEnum(studentfees_status)
  @IsOptional()
  status?: studentfees_status;

  @IsDateString()
  @IsOptional()
  start_date?: Date;

  @IsDateString()
  @IsOptional()
  end_date?: Date;

  @IsString()
  created_by: string;

  @IsString()
  updated_by: string; // ✅ added this line
}


export class UpdateBusFeeStructureDto {
  @IsString()
  @IsOptional()
  route?: string;

  @IsString()
  @IsOptional()
  term?: string;

  @IsNumber()
  @IsOptional()
  amount_month?: number;

  @IsNumber()
  @IsOptional()
  total_amount?: number;

  @IsEnum(studentfees_status)
  @IsOptional()
  status?: studentfees_status;

  @IsDateString()
  @IsOptional()
  start_date?: Date;

  @IsDateString()
  @IsOptional()
  end_date?: Date;

  @IsString()
  @IsOptional()
  updated_by?: string;
}
