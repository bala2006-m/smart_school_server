import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  messages: string;

  @IsNumber()
   @IsNotEmpty()
  schoolId: number;
}
