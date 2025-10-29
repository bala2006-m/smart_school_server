import { Controller, Get, Param, Post, Body, Put, Delete } from '@nestjs/common';
import { FeePaymentsService } from './fee-payments.service';

@Controller('fee-payments')
export class FeePaymentsController {
  constructor(private readonly service: FeePaymentsService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.service.getById(Number(id));
  }

  @Post()
  async create(@Body() data: any) {
    return this.service.createFeePayment(data);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.service.delete(Number(id));
  }
}
