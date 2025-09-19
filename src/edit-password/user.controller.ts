import { Controller, Patch, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { EditPasswordDto } from './dto/edit-password.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('edit-password')
  async editPassword(@Body() dto: EditPasswordDto) {
    return this.userService.editPassword(dto);
  }
}
