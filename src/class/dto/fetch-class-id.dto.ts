import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchClassIdDto {
  @IsInt()
  @Type(() => Number)
  school_id: number;

  @IsString()
  class: Number;

  @IsString()
  section: string;
}
