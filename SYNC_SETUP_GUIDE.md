# Database Synchronization Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd "C:\School Attendance\ramchin smart school\smart_school_server"
npm install
```

### 2. Update Local Database Schema
Your local database already has `sync_status` fields. Ensure they match the cloud schema.

### 3. Start Cloud Server
```bash
npm run start:dev
```

### 4. Start Local Server (Desktop Only)
```bash
cd "C:\School Attendance\ramchin smart school\New folder\smart_school_server"
npm run start:dev
```

### 5. Update Flutter Dependencies
```bash
cd "C:\School Attendance\ramchin smart school\school_attendance"
flutter pub get
```

## 📋 How It Works

### Desktop Users (Hybrid Mode)
- ✅ Automatically detects local MySQL server
- ✅ Routes API calls to local server first
- ✅ Stores data locally AND syncs to cloud
- ✅ Real-time updates from mobile users
- ✅ Works offline with sync queue

### Mobile Users (Cloud Mode)
- ✅ Uses cloud backend only
- ✅ Real-time updates to desktop users
- ✅ No configuration required

## 🔧 Testing the Setup

### 1. Test Sync Status
```bash
curl http://localhost:3000/sync/status
```

### 2. Test Database Connections
```bash
curl -X POST http://localhost:3000/sync/test-connection
```

### 3. Trigger Full Sync
```bash
curl -X POST http://localhost:3000/sync/full-sync
```

## 🎯 Adding Sync to New Controllers

Simply add the `@EnableSync` decorator to your controller methods:

```typescript
import { EnableSync } from '../common/sync/sync.decorator';

@Controller('students')
export class StudentsController {
  @Post('create')
  @EnableSync('Student', 'create')
  async createStudent(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto);
  }

  @Put('update')
  @EnableSync('Student', 'update')
  async updateStudent(@Body() dto: UpdateStudentDto) {
    return this.studentsService.updateStudent(dto);
  }

  @Delete('delete')
  @EnableSync('Student', 'delete')
  async deleteStudent(@Param('id') id: string) {
    return this.studentsService.deleteStudent(id);
  }
}
```

## 📊 Available Tables for Sync

All major tables are supported:
- Student, Staff, Admin
- StudentAttendance, StaffAttendance
- StudentFees, FeePayments
- Finance, Homework, LeaveRequest
- Classes, School, Holidays
- Messages, Feedback, Tickets
- ExamMarks, ExamTimeTable
- And more...

## 🔍 Monitoring Sync

### Backend Logs
Look for these log messages:
- `Sync queued for TableName - operation from source`
- `Broadcasting sync update`
- `Database change: operation on tableName`

### Flutter App
Add the `RealtimeSyncWidget` to your admin dashboard to see:
- Live sync status
- Connection indicators
- Recent changes feed
- Manual sync controls

## 🛠️ Troubleshooting

### Local Server Not Detected
1. Ensure MySQL is running on localhost:3306
2. Check database credentials in local schema.prisma
3. Verify local server is running on port 3000-3002

### Sync Not Working
1. Check both servers are running
2. Verify database schemas match
3. Check network connectivity between servers
4. Review sync status endpoint for errors

### WebSocket Issues
Currently using simplified WebSocket implementation. Full WebSocket support will be added in the next update.

## 📈 Performance Benefits

- **Desktop Users**: Local database speed + cloud backup
- **Mobile Users**: Cloud reliability + real-time desktop updates
- **Admins**: Real-time visibility into all data changes
- **System**: Automatic conflict resolution and sync queue

## 🔒 Data Safety

- All data is backed up to cloud
- Local database provides offline capability
- Sync queue prevents data loss
- Timestamp-based conflict resolution

## 📞 Support

For issues or questions:
1. Check server logs for error messages
2. Verify database connections
3. Test sync status endpoint
4. Review this guide for common solutions
