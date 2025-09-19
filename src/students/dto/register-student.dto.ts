import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  gender: Gender;

  @IsString()
  mobile: string;

  @IsString()
  class_id: number;

  @IsString()
  school_id: number;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain letters and numbers',
  })
  password: string;
}
