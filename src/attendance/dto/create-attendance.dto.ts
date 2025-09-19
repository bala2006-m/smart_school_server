import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsIn(['FN', 'AN'])
  session: 'FN' | 'AN';

  @IsIn(['P', 'A'])
  status: 'P' | 'A';

  @IsString()
  school_id: string;

  @IsString()
  class_id: string;
}
