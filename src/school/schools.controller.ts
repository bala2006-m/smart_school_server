// src/school/schools.controller.ts
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,Query,Param,HttpException, HttpStatus,Patch
} from '@nestjs/common';import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('school')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}
  @Get('combined/:schoolId')
  async getCombinedData(@Param('schoolId') schoolId: string) {
    return this.schoolsService.fetchCombinedSchoolData(Number(schoolId));
  }

  @Get('fetch_school_data')
  async getSchoolById(@Query('id') id: string) {
    // Validate that ID is provided and is a number
    if (!id || isNaN(Number(id))) {
      return { status: 'error', message: 'Invalid or missing school ID' };
    }

    try {
      const school = await this.schoolsService.findById(Number(id));

      if (!school) {
        return { status: 'error', message: 'School not found' };
      }

      // Convert photo (Buffer) to base64
      const photoBase64 = school.photo
        ? Buffer.from(school.photo).toString('base64')
        : null;

      return {
        status: 'success',
        schools: [
          {
            id: school.id,
            name: school.name,
            address: school.address,
            photo: photoBase64,
            createAt:school.createdAt,
            dueDate:school.dueDate,
          },
        ],
      };
    } catch (error) {
      console.error('Error fetching school:', error);
      return { status: 'error', message: 'Internal server error' };
    }
  }

  @Get('fetch_all_schools')
  async getAllSchools() {
    try {
      const schools = await this.schoolsService.findAllSchools();

      if (!schools || schools.length === 0) {
        return { status: 'error', message: 'No schools found' };
      }

      return {
        status: 'success',
        schools: schools.map((school) => ({
          id: school.id,
          name: school.name,
          address: school.address,
          photo: school.photo
            ? Buffer.from(school.photo).toString('base64')
            : null,
        })),
      };
    } catch (error) {
      console.error('Error fetching schools:', error);
      return { status: 'error', message: 'Internal server error' };
    }
  }
   @Post('create')
  @UseInterceptors(FileInterceptor('photo')) // Expect multipart/form-data
  create(
    @Body() createSchoolDto: CreateSchoolDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.schoolsService.create(createSchoolDto, file);
  }

  @Patch(':id/due-date')
  async updateDueDate(
    @Param('id') id: string,
    @Body() body: { dueDate: string }, // Expected format: "2025-12-31" or ISO string
  ) {
    try {
      const dueDate = new Date(body.dueDate);
      
      if (isNaN(dueDate.getTime())) {
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }

      const updatedSchool = await this.schoolsService.updateDueDate(
        Number(id),
        dueDate,
      );

      return {
        message: 'Due date updated successfully',
        school: updatedSchool,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update due date',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get school with payment history
  @Get(':id/with-payments')
  async getSchoolWithPayments(@Param('id') id: string) {
    try {
      const school = await this.schoolsService.getSchoolWithPayments(Number(id));
      
      if (!school) {
        throw new HttpException('School not found', HttpStatus.NOT_FOUND);
      }
      
      return school;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch school with payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Check if payment is overdue
  @Get(':id/payment-status')
  async checkPaymentStatus(@Param('id') id: string) {
    try {
      const isOverdue = await this.schoolsService.isPaymentOverdue(Number(id));
      const school = await this.schoolsService.getSchoolById(Number(id));

      return {
        schoolId: Number(id),
        isOverdue,
        dueDate: school?.dueDate,
        message: isOverdue ? 'Payment is overdue' : 'Payment is up to date',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check payment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }  
}

