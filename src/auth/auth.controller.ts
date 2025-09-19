import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterDesignationDto } from './dto/register-designation.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { log } from 'console';
import { Table } from 'typeorm';
import { Param } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  @Post('register-designation')
  async registerDesignation(@Body() dto: RegisterDesignationDto) {
    return this.authService.registerDesignation(dto);
  }
  @Post('register_student')
  async registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }
@Post('excel-upload/:table/:school_id/:faculty')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const folder = `./uploads/${req.params.table}`;
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
      },
      filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${file.originalname}`),
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException('Only Excel files are allowed'), false);
    },
  }),
)
async uploadExcel(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: any,
) {
  
  if (!file) throw new BadRequestException('No file uploaded');

  const table = req.params.table;
  const paramSchoolId = req.params.school_id;
const faculty=req.params.faculty;
  if (!['admin', 'staff', 'students'].includes(table)) {
    throw new BadRequestException('Invalid table type');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('Excel file has no sheets');

  const createdRecords: { row: number; username: string; reason: string }[] = [];
  const existingRecords: { row: number; username: string; reason: string }[] = [];
  const errors: { row: number; username: string; reason: string }[] = [];
  const emptyRows: { row: number; reason: string }[] = [];
  const mismatched: { row: number; username: string; expected: string; found: string }[] = [];

  let totalRows = 0;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    // ✅ Check if row is null or truly empty
    if (
      !row ||
      !Array.isArray(row.values) ||
      row.values.length === 0 ||
      (Array.isArray(row.values) && row.values.every((v) => v === null))
    ) {
      emptyRows.push({ row: i - 1, reason: 'Empty row detected' });
      continue;
    }

    const valuesArray = Array.isArray(row.values)
      ? row.values.slice(1)
      : Object.values(row.values);

    const isRowCompletelyEmpty = valuesArray.every(
      (cell) =>
        !cell ||
        (typeof cell === 'object' && 'text' in cell && !cell.text) ||
        (typeof cell === 'string' && cell.trim() === ''),
    );

    if (isRowCompletelyEmpty) {
      emptyRows.push({ row: i - 1, reason: 'Empty row detected' });
      continue;
    }

    totalRows++;
console.log(valuesArray);

    const dto = this.mapRowToDto(valuesArray, table);
    dto.table = table;

    // ✅ Check school_id mismatch
    if (dto.school_id !== paramSchoolId) {
      mismatched.push({
        row: i - 1,
        username: dto.username || 'Unknown',
        expected: paramSchoolId,
        found: dto.school_id || 'empty',
      });
      continue;
    }

    try {
  let result; // declare once here

  if (table === 'staff') {
    result = await this.authService.registerDesignation1(dto, faculty);
  } else {
    result = await this.authService.registerDesignation1(dto);
  }

  if (result?.emptyRow) {
    emptyRows.push({ row: i - 1, reason: 'Empty row detected' });
    continue;
  }

  if (result?.alreadyExisting) {
    existingRecords.push({
      row: i - 1,
      username: dto.username || 'Unknown',
      reason: 'Already exists',
    });
  } else if (result) {
    createdRecords.push({
      row: i - 1,
      username: dto.username || 'Unknown',
      reason: 'Created successfully',
    });
  }
} catch (err) {
  errors.push({
    row: i - 1,
    username: valuesArray[0]?.toString()?.trim() || 'Unknown',
    reason: err.message || 'Unknown error',
  });
}
  }

  // ✅ If Excel has no valid rows
  if (totalRows === 0 && emptyRows.length > 0) {
    return {
      Table: table,
      status: 'failed',
      message: 'Your Excel is empty. Please upload a valid file with data.',
    };
  }

  return {
    Table: table,
    status: 'success',
    message: `${createdRecords.length} created, ${existingRecords.length} duplicates, ${emptyRows.length} empty rows, ${mismatched.length} mismatched school_id, ${errors.length} errors.`,
    created: createdRecords,
    duplicates: existingRecords,
    empty: emptyRows,
    mismatched: mismatched,
    errors: errors,
  };
}
private mapRowToDto(values: any[], table: string): RegisterDesignationDto {
  const get = (i: number) => this.getCellValue(values[i]);
  switch (table) {
    case 'admin':
      return {
        username: values[0]?.toString()?.trim() ?? '',
        name: values[1]?.toString()?.trim() ?? '',
        gender: values[2]?.toString()?.trim() ?? '',
        designation: values[3]?.toString()?.trim() ?? '',
        school_id: values[4]?.toString()?.trim() ?? '',
        mobile: values[5]?.toString()?.trim() ?? '',
        email: get(6),
        class_id: '',
        password: values[7]?.toString()?.trim() ?? '',
        role: '',
        table,
      };
    case 'staff':
   return {
        username: values[0]?.toString()?.trim() ?? '',
        name: values[1]?.toString()?.trim() ?? '',
        gender: values[2]?.toString()?.trim() ?? '',
        designation: values[3]?.toString()?.trim() ?? '',
        school_id: values[4]?.toString()?.trim() ?? '',
        mobile: values[5]?.toString()?.trim() ?? '',
        email: get(6),
        password: values[7]?.toString()?.trim() ?? '',
        role: '',
        class_id: '',
        table,
      };
    case 'students':
     return {
        username: values[0]?.toString()?.trim() ?? '',
        name: values[1]?.toString()?.trim() ?? '',
        gender: values[2]?.toString()?.trim() ?? '',
        mobile: values[3]?.toString()?.trim() ?? '',
        email: get(4),
        school_id: values[5]?.toString()?.trim() ?? '',
        class_id: values[6]?.toString()?.trim() ?? '',
        password: values[7]?.toString()?.trim() ?? '',
        DOB:values[8]?.toString()?.trim() ?? '',
        community:values[9]?.toString()?.trim() ?? '',
        father_name:values[10]?.toString()?.trim() ?? '',
        route:values[11]?.toString()?.trim() ?? '',
        role: '',
        designation: '',
        table,
    

      };
    default:
      throw new BadRequestException('Unknown table');
  }}
private getCellValue(cell: any): string {
  if (cell == null) return '';
  if (typeof cell === 'object' && 'text' in cell) return cell.text?.toString()?.trim() ?? '';
  return cell.toString().trim();
}
   @Post('send_otp')
  async sendOtp(@Body() body: { email: string; otp: string }) {
    const { email, otp } = body;

    // ✅ Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ status: 'error', message: 'A valid email is required' });
    }

    // ✅ Validate OTP
    if (!otp) {
      throw new BadRequestException({ status: 'error', message: 'OTP is missing' });
    }

    // ✅ Call service to send email
    return this.authService.sendOtp(email, otp);
  }

  // ✅ Update Password using Username
  @Post('update_password')
  async updatePassword(@Body() body: { username: string; newPassword: string,school_id:number }) {
    const { username, newPassword ,school_id} = body;

    // Input validation
    if (!username) {
      throw new BadRequestException({ status: 'error', message: 'Username is required' });
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException({
        status: 'error',
        message: 'Password must be at least 6 characters long',
      });
    }

    return this.authService.updatePassword(username, newPassword,school_id);
  }
}
