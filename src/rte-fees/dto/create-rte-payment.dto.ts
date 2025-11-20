import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { BusFeesStatus } from '@prisma/client';

export class CreateRtePaymentDto {
  @IsInt()
  school_id: number;

  @IsInt()
  class_id: number;

  @IsString()
  student_id: string;

  @IsInt()
  rte_fee_structure_id: number;

  @IsNumber()
  amount_paid: number;

  @IsString()
  payment_mode: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsEnum(BusFeesStatus)
  status: BusFeesStatus;

  @IsString()
  created_by: string;
}
