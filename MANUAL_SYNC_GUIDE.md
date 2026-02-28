# Manual Sync Guide for Smart School System

## 🚨 When to Use Manual Sync

Use manual sync when:
- **Mobile users** made changes that haven't synced to local
- **Cloud database** was manually updated (direct DB changes)
- **Data inconsistency** between cloud and local databases
- **After maintenance** or database restores
- **Testing** new data or features

## 📱 Available Manual Sync Options

### 1. **Quick Manual Sync** (Recommended for most cases)
```bash
curl -X POST http://localhost:3000/offline/manual-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1, "userId": "user123"}'
```

**What it does:**
- ✅ Performs complete initial sync from cloud to local
- ✅ Triggers user-specific login sync
- ✅ Broadcasts sync status to all connected clients
- ✅ Syncs all 22 tables in correct dependency order

### 2. **Initial Sync Only** (Full data refresh)
```bash
curl -X POST http://localhost:3000/offline/initial-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

**What it does:**
- ✅ Syncs all tables from cloud to local
- ✅ Maintains dependency order
- ✅ Handles composite keys correctly

### 3. **Login Sync** (User-specific data)
```bash
curl -X POST http://localhost:3000/offline/login-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1, "userId": "user123"}'
```

**What it does:**
- ✅ Syncs user-specific data
- ✅ Updates user permissions and access
- ✅ Faster than full sync

### 4. **Force Sync** (When regular sync fails)
```bash
curl -X POST http://localhost:3000/offline/force-sync
```

**What it does:**
- ✅ Forces all pending operations to sync
- ✅ Handles sync conflicts
- ✅ Clears sync queue after completion

### 5. **Cloud-to-Local Sync** (Messages only)
```bash
curl -X POST http://localhost:3000/offline/sync-from-cloud \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

**What it does:**
- ✅ Syncs messages from cloud to local
- ✅ Useful for communication updates

## 🔄 Periodic Sync Management

### Start Automatic Sync (Every 5 minutes)
```bash
curl -X POST http://localhost:3000/offline/start-periodic-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

### Stop Automatic Sync
```bash
curl -X POST http://localhost:3000/offline/stop-periodic-sync/1
```

## 📊 Monitoring Sync Status

### Check Overall Sync Status
```bash
curl http://localhost:3000/offline/all-sync-status
```

### Check Specific School Sync Status
```bash
curl http://localhost:3000/offline/login-sync-status/1
```

### Check Pending Operations
```bash
curl http://localhost:3000/offline/pending-operations
```

### Check Offline Status
```bash
curl http://localhost:3000/offline/status
```

## 🛠️ Troubleshooting

### If Sync Fails:

1. **Check Connectivity:**
```bash
curl -X POST http://localhost:3000/offline/check-connectivity
```

2. **Clear Pending Operations:**
```bash
curl -X POST http://localhost:3000/offline/clear-synced
```

3. **Force Full Sync:**
```bash
curl -X POST http://localhost:3000/offline/force-sync
```

4. **Restart with Initial Sync:**
```bash
curl -X POST http://localhost:3000/offline/manual-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

## 📋 Common Scenarios

### Scenario 1: Mobile User Changes Not Synced
```bash
# Step 1: Check pending operations
curl http://localhost:3000/offline/pending-operations

# Step 2: Force sync
curl -X POST http://localhost:3000/offline/force-sync

# Step 3: Verify sync status
curl http://localhost:3000/offline/all-sync-status
```

### Scenario 2: Cloud Database Manually Updated
```bash
# Step 1: Perform full manual sync
curl -X POST http://localhost:3000/offline/manual-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'

# Step 2: Verify all tables synced
curl http://localhost:3000/offline/all-sync-status
```

### Scenario 3: After Database Maintenance
```bash
# Step 1: Check connectivity
curl -X POST http://localhost:3000/offline/check-connectivity

# Step 2: Clear any pending operations
curl -X POST http://localhost:3000/offline/clear-synced

# Step 3: Perform full sync
curl -X POST http://localhost:3000/offline/initial-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

## 🔄 Automated Sync Setup

### Enable Periodic Sync (Recommended)
```bash
# Start automatic sync for school 1
curl -X POST http://localhost:3000/offline/start-periodic-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'

# This will automatically sync every 5 minutes
```

### Monitor Sync Health
```bash
# Check status every few minutes
curl http://localhost:3000/offline/all-sync-status
```

## 💡 Pro Tips

1. **Always use `manual-sync`** after cloud database changes
2. **Check sync status** before and after manual operations
3. **Use periodic sync** for automatic updates
4. **Monitor pending operations** to detect issues early
5. **Keep mobile app online** when possible for automatic sync

## 🚨 Emergency Procedures

### If All Else Fails:
```bash
# 1. Stop all periodic sync
curl -X POST http://localhost:3000/offline/stop-periodic-sync/1

# 2. Clear all pending operations
curl -X POST http://localhost:3000/offline/clear-synced

# 3. Force full sync
curl -X POST http://localhost:3000/offline/force-sync

# 4. Perform initial sync
curl -X POST http://localhost:3000/offline/initial-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'

# 5. Restart periodic sync
curl -X POST http://localhost:3000/offline/start-periodic-sync \
  -H "Content-Type: application/json" \
  -d '{"schoolId": 1}'
```

This should resolve any sync issues and restore normal operation.
