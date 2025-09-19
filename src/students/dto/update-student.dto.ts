import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';

export enum Gender {
  Male = 'M',
  Female = 'F',
  Other = 'O',
}

export class UpdateStudentDto {
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
  photo?: string; // Base64 string

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be one of M, F, or O',
  })
  gender?:Gender;

   @IsOptional()
  @IsString()
  father_name?: string;

   @IsOptional()
  @IsString()
  community?: string;

   @IsOptional()
  @IsString()
  route?: string;

   @IsOptional()
  @IsString()
  DOB?: string;
}
