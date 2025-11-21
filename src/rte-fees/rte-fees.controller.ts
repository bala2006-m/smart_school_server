import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { RteFeesService } from './rte-fees.service';
import { CreateRteStructureDto } from './dto/create-rte-structure.dto';
import { UpdateRteStructureDto } from './dto/update-rte-structure.dto';
import { CreateRtePaymentDto } from './dto/create-rte-payment.dto';

@Controller('rte-fees')
export class RteFeesController {
  constructor(private readonly service: RteFeesService) {}

  // STRUCTURES ============================================================
  @Post('structure')
  createStructure(@Body() dto: CreateRteStructureDto) {
    return this.service.createStructure(dto);
  }

  @Get('structure')
  findAllStructures(
    @Query('school_id') school_id: number,
    @Query('class_id') class_id?: number,
  ) {
    return this.service.findAllStructures(Number(school_id), Number(class_id));
  }

  @Get('structure/:id')
  findOneStructure(@Param('id') id: number) {
    return this.service.findOneStructure(Number(id));
  }

  @Patch('structure/:id')
  updateStructure(
    @Param('id') id: number,
    @Body() dto: UpdateRteStructureDto,
  ) {
    return this.service.updateStructure(Number(id), dto);
  }

  @Delete('structure/:id')
  removeStructure(@Param('id') id: number) {
    return this.service.removeStructure(Number(id));
  }

  // PAYMENTS ==============================================================
  @Post('payment')
  createPayment(@Body() dto: CreateRtePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Get('payment')
  listPayments(
    @Query('school_id') school_id: number,
    @Query('student_id') student_id?: string,
  ) {
    return this.service.listPayments(Number(school_id), student_id);
  }
@Get('rte_students')
  findAllRteStudents(
    @Query('school_id') school_id: number,
    @Query('class_id') class_id?: number,
  ) {
    return this.service.findAllRteStudents(Number(school_id), Number(class_id));
  }

  @Get('rte_paid_students')
  findAllRtePaidStudents(
    @Query('school_id') school_id: number,
    @Query('class_id') class_id?: number,
  ) {
    return this.service.findAllRtePaidStudents(Number(school_id), Number(class_id));
  }
 @Get('pending_paid_school/:schoolId')
  findPendingPaidBySchool(@Param('schoolId') schoolId: string) {
    return this.service.findPendingPaidBySchool(Number(schoolId));
  }
}
