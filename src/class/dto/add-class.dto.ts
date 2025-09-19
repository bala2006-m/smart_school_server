import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

export class AddClassDto {
  @IsString()
  @IsNotEmpty()
  class: string;

  @IsString()
  @IsNotEmpty()
  section: string;

  @IsNumberString()
  @IsNotEmpty()
  school_id: string;
}
