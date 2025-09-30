import { IsEmail, IsNotEmpty, IsString, IsNumberString } from 'class-validator';
export enum Gender {
  M = 'M',
  F = 'F',
  O = 'O',
}

export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gender: Gender;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsNumberString()
  @IsNotEmpty()
  class_id: string;

  @IsNumberString()
  @IsNotEmpty()
  school_id: string;
  
  @IsString()
  @IsNotEmpty()
  fatherName: string;
  
  @IsString()
  @IsNotEmpty()
  community: string;
  
  
  @IsString()
  @IsNotEmpty()
  route: string;
  
  @IsString()
  @IsNotEmpty()
  dob: string;

  
}
