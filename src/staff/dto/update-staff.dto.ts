import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';

export enum Gender {
  Male = 'M',
  Female = 'F',
  Other = 'O',
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  photo?: string;
  
  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be one of M, F, or O',
  })
  gender?: Gender;
}
