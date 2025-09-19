import { Controller, Get, Param, ParseIntPipe ,Post,Body} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('last/:schoolId')
  async getLastMessage(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.messagesService.getLastMessageBySchoolId(schoolId);
  }
  @Post('post-message')
  async postMessage(@Body() dto: CreateMessageDto) {
    return this.messagesService.postMessage(dto.messages, dto.schoolId);
  }
}
