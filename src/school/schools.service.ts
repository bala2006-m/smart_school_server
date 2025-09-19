// src/school/schools.service.ts
import { Injectable ,InternalServerErrorException} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number) {
    return await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        photo: true,
      },
    });
  }
  async findAllSchools() {
  try {
    return await this.prisma.school.findMany({
      select: { id: true, name: true, address: true, photo: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    throw new Error(`Failed to fetch schools: ${error.message}`);
  }
}
async create(createSchoolDto: CreateSchoolDto, file: Express.Multer.File) {
  const existingSchool = await this.prisma.school.findUnique({
    where: { name: createSchoolDto.name },
  });

  if (existingSchool) {
    throw new InternalServerErrorException(`School is already registered`);
  }

  return this.prisma.school.create({
    data: {
      id:Number(createSchoolDto.schoolId),
      name: createSchoolDto.name,
      address: createSchoolDto.address,
      photo: new Uint8Array(file.buffer),
    },
  });
}


}
