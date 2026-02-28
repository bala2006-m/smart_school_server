# Testing Message Sync

## 🧪 Test the Sync System

### 1. Check Current Status
```bash
curl http://localhost:3000/offline/status
```

### 2. Test Manual Sync
```bash
curl -X POST http://localhost:3000/offline/test-sync \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "Messages",
    "operation": "create", 
    "data": {
      "messages": "Test message from API",
      "schoolId": 1,
      "role": "admin"
    }
  }'
```

### 3. Create Message via Web Interface
1. Open your web app
2. Create a new message
3. Check if it appears in local database

### 4. Check Pending Operations
```bash
curl http://localhost:3000/offline/pending-operations
```

### 5. Force Sync
```bash
curl -X POST http://localhost:3000/offline/force-sync
```

## 🔍 Debug Steps

### Check Database Config
```bash
curl http://localhost:3000/sync/status
```

### Check Local Database
```sql
-- Check if message was stored locally
SELECT * FROM Messages WHERE messages LIKE '%Test%' ORDER BY id DESC LIMIT 5;

-- Check sync status
SELECT id, messages, sync_status, created_at FROM Messages ORDER BY id DESC LIMIT 5;
```

### Check Cloud Database  
```sql
-- Check if message was synced to cloud
SELECT * FROM Messages WHERE messages LIKE '%Test%' ORDER BY id DESC LIMIT 5;
```

## 📋 Expected Behavior

1. **Web Request** → Should be detected as desktop/local
2. **Local Storage** → Message stored in local MySQL first
3. **Cloud Sync** → Message queued for cloud sync
4. **Automatic Sync** → Synced to cloud within 30 seconds
5. **Real-time Update** → Other desktop users see the message

## 🐛 Common Issues

### Issue: Web requests treated as mobile
**Solution**: Check user agent detection and hybrid mode status

### Issue: Local database not available  
**Solution**: Verify local MySQL is running and accessible

### Issue: Sync not working
**Solution**: Check pending operations and force sync

### Issue: Table not found
**Solution**: Verify table name mapping in offline-first.service.ts

## 🚀 Quick Fix Commands

```bash
# Restart both servers
cd "C:\School Attendance\ramchin smart school\smart_school_server"
npm run start:dev

cd "C:\School Attendance\ramchin smart school\New folder\smart_school_server"  
npm run start:dev

# Clear pending operations
curl -X POST http://localhost:3000/offline/clear-synced

# Check connectivity
curl -X POST http://localhost:3000/offline/check-connectivity
```
