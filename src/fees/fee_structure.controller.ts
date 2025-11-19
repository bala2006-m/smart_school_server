import { 
  Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, Delete, NotFoundException, BadRequestException 
} from '@nestjs/common';
import { FeeStructureService } from './fee_structure.service';

class CreateFeeDto {
  school_id: number;
  class_id: number;
  title?: string;
  description?: any;
  amounts?: any;
  total_amount?: number;
  start_date?: string;
  end_date?: string;
  created_by: string;
  updated_by?: string;
}

class UpdateFeeDto {
  title?: string;
  description?: any;
  amounts?: any;
  total_amount?: number;
  start_date?: string;
  end_date?: string;
  updated_by?: string;
}

@Controller('fees/structure')
export class FeeStructureController {
  constructor(private readonly feeStructureService: FeeStructureService) {}

  // ✅ Add new fee structure
  @Post()
  async createFee(@Body() body: CreateFeeDto) {
    return this.feeStructureService.createFeeStructure(body);
  }

  // ✅ Get all fees for a school
  @Get()
  async getAll(@Query('schoolId', ParseIntPipe) schoolId: number) {
    return this.feeStructureService.getAllFeeStructures(schoolId);
  }

  // ✅ Get fee structures by class
  @Get('class/:classId')
  async getByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('schoolId', ParseIntPipe) schoolId: number,
  ) {
    return this.feeStructureService.getFeeStructuresByClass(schoolId, classId);
  }
    @Get('all_class/:classId')
  async getAllByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('schoolId', ParseIntPipe) schoolId: number,
  ) {
    return this.feeStructureService.getAllFeeStructuresByClass(schoolId, classId);
  }
 @Get('class_name/:className')
  async getByClassName(
    @Param('className') className: string,
    @Query('schoolId', ParseIntPipe) schoolId: number,
  ) {
  
    
    return this.feeStructureService.getFirstFeeStructuresByClassName(schoolId, className);
  }
  // ✅ Update fee status
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {console.log(status);
  
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    return this.feeStructureService.updateStatus(id, status);
  }

  // ✅ Update fee structure details
  @Patch(':id')
  async updateFee(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateFeeDto) {
    return this.feeStructureService.updateFeeStructure(id, data);
  }

  // ✅ Delete a fee structure
  @Delete(':id')
  async deleteFee(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.feeStructureService.deleteFeeStructure(id);
    } catch (error) {
    
      
      throw new NotFoundException('Fee structure not found');
    }
  }
}
