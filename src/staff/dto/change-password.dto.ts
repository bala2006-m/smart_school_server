import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangeStaffPasswordDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'New password must contain letters and numbers',
  })
  new_password: string;
}
