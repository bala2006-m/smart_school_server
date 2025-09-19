import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async editPassword(dto: {
    username: string;
    role: string;
    school_id: number;
    oldPassword: string;
    newPassword: string;
  }) {
    const user = await this.prisma.attendance_user.findUnique({
      where: {
         username_school_id: { username:dto.username, school_id: Number(dto.school_id) }
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

    await this.prisma.attendance_user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
