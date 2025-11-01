import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { BusFeeStructureService } from './bus-fee-structure.service';

@Controller('bus-fee-structure')
export class BusFeeStructureController {
  constructor(private readonly service: BusFeeStructureService) {}

  @Post() create(@Body() data: any) {
    return this.service.create(data);
  }

  @Get() findAll() {
    return this.service.findAll();
  }

  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id') update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
