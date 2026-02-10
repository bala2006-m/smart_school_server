import { Controller, Get, Param, ParseIntPipe, Post, Body, Delete } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Get('last/:schoolId')
  async getLastMessage(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.messagesService.getLastMessageBySchoolId(schoolId);
  }
    @Get('last_role/:schoolId/:role')
  async getLastMessageRole(@Param('schoolId', ParseIntPipe) schoolId: number,@Param('role')role:string) {
    return this.messagesService.getLastMessageBySchoolIdRole(schoolId,role.toLocaleLowerCase());
  }
  @Get('all/:schoolId')
  async getAllMessage(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.messagesService.getAllBySchoolId(schoolId);
  }
  @Delete('delete/:id')
  async delete(@Param('id') id: number) {
 

    return this.messagesService.delete(+id);
  }
  @Post('post-message')
  async postMessage(@Body() dto: CreateMessageDto) {
    return this.messagesService.postMessage(dto.messages, dto.schoolId ,dto.role);
  }
}
