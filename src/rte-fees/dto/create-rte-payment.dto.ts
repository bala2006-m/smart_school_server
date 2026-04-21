import { rtefeepayment_status } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
 
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

  @IsEnum(rtefeepayment_status)
  status: rtefeepayment_status;

  @IsString()
  created_by: string;
 @IsString()
  payment_date:string;
}
