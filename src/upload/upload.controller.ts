import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/var/www/images',
      filename: (req, file, callback) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, uniqueName + ext);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `https://smartschoolserver.ramchintech.com/images/${file.filename}`;
    return { url: imageUrl };
  }
}
