// src/finance/finance.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Finance } from '@prisma/client';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  create(@Body() createFinanceDto: any): Promise<Finance> {
    return this.financeService.create(createFinanceDto);
  }

//   @Get()
//   findAll(): Promise<Finance[]> {
//     return this.financeService.findAll();
//   }

  @Get('income/:schoolId')
  findOne(@Param('schoolId') id: string) {
    return this.financeService.findIncome(Number(id));
  }
@Get('expense/:schoolId')
  findExpense(@Param('schoolId') id: string) {
    return this.financeService.findExpense(Number(id));
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() updateFinanceDto: any): Promise<Finance> {
    return this.financeService.update(Number(id), updateFinanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Finance> {
    return this.financeService.remove(Number(id));
  }
}
