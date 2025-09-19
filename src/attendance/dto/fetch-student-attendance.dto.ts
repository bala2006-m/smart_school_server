// src/dto/fetch-student-attendance.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class FetchStudentAttendanceDto {
  @IsNotEmpty()
  @IsString()
  class_id: string;

  @IsNotEmpty()
  @IsString()
  school_id: string;

  @IsString()
  username: string;
}
