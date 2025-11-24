import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { BusFeePaymentService } from './bus-fee-payment.service';

@Controller('bus-fee-payment')
export class BusFeePaymentController {
  constructor(private readonly service: BusFeePaymentService) {}

  @Post()
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  // 🟢 Get by student
  @Get('student')
  findByStudent(
    @Query('student_id') studentId: string,
    @Query('school_id') schoolId: string,
  ) {
    return this.service.findByStudent(studentId, Number(schoolId));
  }

  // 🟣 Get all payments by school
  @Get('school/:schoolId')
  findBySchool(@Param('schoolId') schoolId: string) {
    return this.service.findBySchool(Number(schoolId));
  }
  @Get('school_date/:schoolId/:date')
  findBySchoolAndDate(@Param('schoolId') schoolId: string,@Param('date') payment_date: string) {
    return this.service.findBySchoolAndDate(Number(schoolId),payment_date);
  }

   @Get('school_class_date/:schoolId/:classId/:date')
  findBySchoolClassAndDate(@Param('schoolId') schoolId: string,@Param('classId') class_id: string,@Param('date') payment_date: string) {
    return this.service.findBySchoolClassAndDate(Number(schoolId),Number(class_id),payment_date);
  }
  // 🟡 Get all payments by school + class
  @Get('school/:schoolId/class/:classId')
  findBySchoolAndClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
  ) {
    return this.service.findBySchoolAndClass(Number(schoolId), Number(classId));
  }

  // 🟠 Get all payments by school + class + student
  @Get('school/:schoolId/class/:classId/student/:studentId')
  findBySchoolClassAndStudent(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.service.findBySchoolClassAndStudent(
      Number(schoolId),
      Number(classId),
      studentId,
    );
  }

   @Get('pending_paid_school/:schoolId')
  findPendingPaidBySchool(@Param('schoolId') schoolId: string) {
    return this.service.findPendingPaidBySchool(Number(schoolId));
  }
}
