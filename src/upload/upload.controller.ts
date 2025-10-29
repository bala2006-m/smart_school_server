import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('upload')
export class UploadController {
  // 🔹 POST /upload
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // The destination will be decided dynamically
        destination: (req, file, callback) => {
          const schoolId = req.body.schoolId;

          if (!schoolId) {
            return callback(new Error('Missing schoolId'), '');
          }

          const uploadPath = join('/var/www/images', schoolId);

          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, uniqueName + ext);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Body('schoolId') schoolId: string) {
    const imageUrl = `https://smartschoolserver.ramchintech.com/images/${schoolId}/${file.filename}`;
    return { url: imageUrl };
  }

  // 🔹 GET /upload/:schoolId
  @Get(':schoolId')
  getImagesBySchool(@Param('schoolId') schoolId: string) {
    const folderPath = join('/var/www/images', schoolId);

    if (!fs.existsSync(folderPath)) {
      return { images: [] };
    }

    const files = fs.readdirSync(folderPath);
    const imageUrls = files.map(
      (file) => `https://smartschoolserver.ramchintech.com/images/${schoolId}/${file}`,
    );

    return { images: imageUrls };
  }
   @Delete(':schoolId/:filename')
  deleteImage(@Param('schoolId') schoolId: string, @Param('filename') filename: string) {
    const filePath = join('/var/www/images', schoolId, filename);

    if (!fs.existsSync(filePath)) {
      return { message: 'File not found' };
    }

    fs.unlinkSync(filePath);
    return { message: 'Deleted successfully' };
  }
}
