import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { staff_gender  } from '@prisma/client';
export class RegisterStaffDto {
    @IsString()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
   gender: staff_gender;

  @IsString()
  mobile: string;

  @IsString()
  photo?: string;

  @IsString()
  class_ids: number[];

  @IsString()
  school_id: number;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain letters and numbers',
  })
  password: string;
}
