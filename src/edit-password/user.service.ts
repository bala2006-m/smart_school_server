import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }

  async editPassword(dto: {
    username: string;
    role: string;
    school_id: number;
    oldPassword: string;
    newPassword: string;
  }) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const user = await (client as any).attendance_user.findUnique({
      where: {
        username_school_id: { username: dto.username, school_id: Number(dto.school_id) }
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(dto.oldPassword, user.password);
    if (!passwordMatches) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await (client as any).attendance_user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
