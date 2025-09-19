import { IsString, IsOptional, IsIn } from 'class-validator';
export enum Gender {
  M = 'M',
  F = 'F',
  O = 'O',
}
export class RegisterDesignationDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  gender: Gender;

  @IsOptional()
  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  designation: string; // Only for admin & staff

  @IsString()
  school_id: string;

  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  class_id: string; // Only for students

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  DOB?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  father_name?: string;

  @IsOptional()
  @IsString()
  route?: string;
  
  @IsIn(['admin', 'staff', 'students'])
  table: 'admin' | 'staff' | 'students';  // To identify role/table
}
