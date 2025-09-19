// src/school/schools.controller.ts
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,Query
} from '@nestjs/common';import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('school')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

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
}

