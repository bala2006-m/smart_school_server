import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateStaffAttendanceDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  date: string; // ISO date

  @IsIn(['FN', 'AN'])
  session: 'FN' | 'AN';

  @IsIn(['P', 'A'])
  status: 'P' | 'A';

  @IsString()
  school_id: string;
}
