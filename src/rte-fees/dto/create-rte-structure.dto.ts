import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRteStructureDto {
  @IsInt()
  school_id: number;

  @IsInt()
  class_id: number;

  @IsArray()
  @IsOptional()
  descriptions?: any[];

  @IsArray()
  @IsOptional()
  amounts?: number[];

  @IsNumber()
  @IsOptional()
  total_amount?: number;

  @IsString()
  created_by: string;

  @IsString()
  @IsOptional()
  status?: string; // active / inactive
}
