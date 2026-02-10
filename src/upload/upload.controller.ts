import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { PrismaService } from '../common/prisma.service';
import { log } from 'console';
import { title } from 'process';

@Controller('upload')
export class UploadController {
  constructor(private prisma: PrismaService) {}
  // 🔹 DELETE /upload/video/:id
  @Delete('videos/:id')
  async deleteVideo(@Param('id') id: string) {
    
  
    const res=  await this.prisma.imageAndVideos.delete({
      where: { id:Number(id) },
    });
 
    return { message: 'Video deleted successfully' };
  }
  // 🔹 POST /upload (Image upload)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const schoolId = req.body.schoolId;
          if (!schoolId) {
            return callback(new Error('Missing schoolId'), '');
          }

          const uploadPath = join('/var/www/images', schoolId);
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('schoolId') schoolId: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('date') date?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!schoolId) throw new BadRequestException('schoolId is required');

    const imageUrl = `https://smartschoolserver.ramchintech.com/images/${schoolId}/${file.filename}`;

    const parsedDate = date ? new Date(date) : new Date();

    // Save to DB
    await this.prisma.imageAndVideos.create({
      data: {
        school_id: parseInt(schoolId),
        link: imageUrl,
        type: 'IMAGE',
        title,
        description,
        date: parsedDate,
      },
    });

    return { url: imageUrl };
  }

  // 🔹 POST /upload/video (Add YouTube video link)
  @Post('video')
  async addVideo(
    @Body('schoolId') schoolId: string,
    @Body('link') link: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('date') date?: string,
  ) {
    if (!schoolId || !link) {
      throw new BadRequestException('schoolId and link are required');
    }

    if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
      throw new BadRequestException('Invalid YouTube link');
    }

    const parsedDate = date ? new Date(date) : new Date();

    const video = await this.prisma.imageAndVideos.create({
      data: {
        school_id: parseInt(schoolId),
        link,
        type: 'VIDEO',
        title,
        description,
        date: parsedDate,
      },
    });

    return { message: 'Video added successfully', video };
  }

  // 🔹 GET /upload/:schoolId (Fetch all images & videos)
  @Get(':schoolId')
  async getMediaBySchool(@Param('schoolId') schoolId: string) {
    const records = await this.prisma.imageAndVideos.findMany({
      where: { school_id: parseInt(schoolId) },
      orderBy: { date: 'desc' },
    });

    const images = records
      .filter((r) => r.type === 'IMAGE')
      .map((r) => ({
        id: r.id,
        link: r.link,
        title: r.title,
        description: r.description,
        date: r.date,
      }));

    const videos = records
      .filter((r) => r.type === 'VIDEO')
      .map((r) => ({
        id: r.id,
        link: r.link,
        title: r.title,
        description: r.description,
        date: r.date,
      }));

    return { images, videos };
  }
@Get('titles/image/:schoolId')
  async getTitlesSchoolIm(@Param('schoolId') schoolId: string) {
    const records = await this.prisma.imageAndVideos.findMany({
      where: { school_id: parseInt(schoolId),type:'IMAGE' },
      select:{
        title:true
      },
      distinct:['title'],
      orderBy: { title: 'desc' },
    });

   
    return records;
  }
  @Get('titles/video/:schoolId')
  async getTitlesSchoolVid(@Param('schoolId') schoolId: string) {
    const records = await this.prisma.imageAndVideos.findMany({
      where: { school_id: parseInt(schoolId),type:'VIDEO' },
      select:{
        title:true
      },
      distinct:['title'],
      orderBy: { title: 'desc' },
    });

   
    return records;
  }
  // 🔹 DELETE /upload/:schoolId/:filename (Delete image from FS & DB)
  @Delete(':schoolId/:filename')
  async deleteImage(
    @Param('schoolId') schoolId: string,
    @Param('filename') filename: string,
  ) {
    const filePath = join('/var/www/images', schoolId, filename);

    // Delete from filesystem if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const imageUrl = `https://smartschoolserver.ramchintech.com/images/${schoolId}/${filename}`;
    await this.prisma.imageAndVideos.deleteMany({
      where: { link: imageUrl },
    });

    return { message: 'Image deleted successfully' };
  }
@Delete('image/:filename')
  async deleteImages(
    @Param('filename') filename: string,
  ) {
 
    await this.prisma.imageAndVideos.deleteMany({
      where: { id: Number(filename) },
    });

    return { message: 'Image deleted successfully' };
  }

}
