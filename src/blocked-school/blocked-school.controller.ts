import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { BlockedSchoolService } from './blocked-school.service';
import { CreateBlockedSchoolDto } from './dto/create-blocked-school.dto';

@Controller('blocked-schools')
export class BlockedSchoolController {
  constructor(private readonly blockedSchoolService: BlockedSchoolService) {}

  // ✅ POST /blocked-schools
  @Post()
  create(@Body() dto: CreateBlockedSchoolDto) {
    return this.blockedSchoolService.create(dto);
  }

  // ✅ DELETE /blocked-schools/:id
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.blockedSchoolService.delete(id);
  }

  // Optional: GET /blocked-schools
  @Get()
  findAll() {
    return this.blockedSchoolService.findAll();
  }
  
  @Get('is-blocked/:id')
  async isBlocked(@Param('id', ParseIntPipe) id: number) {
    return this.blockedSchoolService.isBlocked(id);
  }
}
