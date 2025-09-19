import { IsInt, IsString } from 'class-validator';

export class CreateBlockedSchoolDto {
  @IsInt()
  school_id: number;

  @IsString()
  reason: string;
}
