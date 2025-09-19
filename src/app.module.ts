import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HolidaysModule } from './holidays/holidays.module';
import { AttendanceModule } from './attendance/attendance.module';
import { StaffModule } from './staff/staff.module';
import { StudentsModule } from './students/students.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClassTimetableModule } from './timetable/class-timetable.module';
import {FeedbackModule} from './feedback/feedback.module';
import { SchoolsModule } from './school/schools.module';
import { ClassesModule } from './class/classes.module';
import { AdminModule } from './admin/admin.module';
import {AuthModule } from './auth/auth.module';
import { AttendanceUserModule } from './attendance-user/attendance-user.module'
import { MessagesModule } from './messages/messages.module';
import { LeaveRequestModule } from './leave_request/leave-request.module';
import { NewsModule } from './news/news.module';
import { BlockedSchoolModule} from'./blocked-school/blocked-school.module';
import { UserModule } from './edit-password/user.module';
import { HomeworkModule } from'./homework/homework.module';

@Module({
  imports: [
    StudentsModule,
        HolidaysModule,
        AttendanceModule,
         StaffModule,
         DashboardModule,
         ClassTimetableModule,
         FeedbackModule,
         SchoolsModule,
         ClassesModule,
         AdminModule,
         AuthModule,
         AttendanceUserModule,
         MessagesModule,
         LeaveRequestModule,
         NewsModule,
         BlockedSchoolModule,
         UserModule,
         HomeworkModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
