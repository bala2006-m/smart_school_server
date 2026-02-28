import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AddClassDto } from './dto/add-class.dto';
import { DeleteClassDto } from './dto/delete-class.dto';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async getAllClassesBySchool(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).classes.findMany({
      where: { school_id: schoolId },
      select: {
        id: true,
        class: true,
        section: true,
      },
      orderBy: {
        class: 'asc',
      },
    });
  }

  async findClassName(classId: number, schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const cls = await (client as any).classes.findFirst({
      where: {
        id: classId,
        school_id: schoolId,
      },
      select: {
        class: true,
        section: true,
      },
    });

    if (!cls) {
      throw new NotFoundException('Class not found for given class_id and school_id');
    }

    return {
      class: cls.class,
      section: cls.section,
    };
  }
  async addClass(dto: AddClassDto) {
    const { class: className, section, school_id } = dto;
    const schoolIdInt = Number(school_id);

    try {
      const client = this.dbConfig.getDatabaseClient(this.request);
      const exists = await (client as any).classes.findFirst({
        where: {
          class: className,
          section,
          school_id: schoolIdInt,
        },
      });

      if (exists) {
        throw new ConflictException('Class already marked');
      }

      const newClass = await (client as any).classes.create({
        data: {
          class: className,
          section,
          school_id: schoolIdInt,
        },
      });

      return {
        status: 'success',
        message: 'Class added successfully',
        data: {
          class: newClass.class,
          section: newClass.section,
          school_id: newClass.school_id,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Add failed: ' //+ error.message

      );
    }
  } async deleteClass(dto: DeleteClassDto) {
    const { class: className, section, school_id } = dto;
    const schoolIdInt = Number(school_id);

    try {
      const client = this.dbConfig.getDatabaseClient(this.request);
      const exists = await (client as any).classes.findFirst({
        where: {
          class: className,
          section,
          school_id: schoolIdInt,
        },
      });

      if (!exists) {
        throw new ConflictException('Class not found');
      }

      const deletedClass = await (client as any).classes.delete({
        where: {
          id: exists.id, // safer to delete by ID to avoid multiple deletes
        },
      });

      return {
        status: 'success',
        message: 'Class deleted successfully',
        data: {
          class: deletedClass.class,
          section: deletedClass.section,
          school_id: deletedClass.school_id,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Delete failed: '// + error.message

      );
    }
  }

  async findClassId(school_id: string, className: string, section: string): Promise<number | null> {
    const schoolIdNum: number = Number(school_id);
    const client = this.dbConfig.getDatabaseClient(this.request);

    const classRecord = await (client as any).classes.findFirst({
      where: {
        school_id: schoolIdNum,
        class: className,
        section: section,
      },
      select: {
        id: true,
      },
    });

    return classRecord?.id || null;
  }


  async getClassData(schoolId: number, classId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).classes.findUnique({
      where: {
        id: classId,
        school_id: schoolId,
      },
      select: {
        id: true,
        class: true,
        section: true,
      },
    });
  }


  async fetchClassData(schoolId: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    return (client as any).classes.findMany({
      where: {
        school_id: schoolId,
      },
      select: {
        id: true,
        class: true,
        section: true,
      },
      orderBy: {
        class: 'asc',
      },
    });
  }
}
