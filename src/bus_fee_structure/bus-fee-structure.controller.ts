import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BusFeeStructureService } from './bus-fee-structure.service';
import { CreateBusFeeStructureDto, UpdateBusFeeStructureDto } from './dto/bus-fee-structure.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Bus Fee Structure')
@Controller('bus-fee-structure')
export class BusFeeStructureController {
  constructor(private readonly service: BusFeeStructureService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bus fee structure' })
  @ApiResponse({ status: 201, description: 'Created successfully' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() data: CreateBusFeeStructureDto) {
    return this.service.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bus fee structures' })
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active bus fee structures' })
  findActive() {
    return this.service.findActive();
  }

  // ✅ NEW: Get all bus fee structures by school_id
  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all bus fee structures for a specific school' })
  findBySchool(@Param('schoolId') schoolId: string) {
    return this.service.findBySchool(Number(schoolId));
  }
    @Get('school_class/:schoolId/:classId')
  @ApiOperation({ summary: 'Get all bus fee structures for a specific school and class' })
  findBySchoolClass(@Param('schoolId') schoolId: string,@Param('classId') classId: string) {
    return this.service.findBySchoolClass(Number(schoolId),Number(classId));
  }
  @Get('route/:schoolId/:route')
  @ApiOperation({ summary: 'Get all bus fee structures for a specific school' })
  findBySchoolRoute(@Param('schoolId') schoolId: string,@Param('route') route: string) {
    return this.service.findBySchoolRoute(Number(schoolId),route);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bus fee structure by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bus fee structure' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id') id: string, @Body() data: UpdateBusFeeStructureDto) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bus fee structure' })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
   @Put(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle bus fee structure status (active/inactive)' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() body: { status: string; updated_by: string },
  ) {
    const { status, updated_by } = body;
    if (!status) {
      throw new Error('Status is required');
    }
    return this.service.toggleStatus(Number(id), status, updated_by);
  }
}
