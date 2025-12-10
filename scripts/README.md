# 🧪 E2E Test Script

Script tự động test end-to-end cho SABOHUB Nexus web app.

## 📋 Usage

```bash
npm run test:e2e
```

## ✅ Test Coverage

### Database Connection
- ✅ Database connection
- ✅ Read companies

### Read Operations
- ✅ Read employees
- ✅ Read tasks
- ✅ Read attendance

### Task Management
- ✅ Create task (may skip if RLS requires auth)
- ✅ Update task (may skip if RLS requires auth)
- ✅ Delete task (may skip if RLS requires auth)
- ✅ Task filters

### Employee Management
- ✅ Create employee (may skip if RLS requires auth)
- ✅ Update employee (may skip if RLS requires auth)
- ✅ Delete employee (may skip if RLS requires auth)
- ✅ Employee search

### Dashboard & Reports
- ✅ Dashboard stats
- ✅ Attendance join queries
- ✅ Reports data aggregation

## ⚙️ Configuration

Script tự động load environment variables từ `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## 📊 Test Results

Script sẽ hiển thị:
- ✅ Passed tests
- ⏭️ Skipped tests (require authentication)
- ❌ Failed tests
- ⏱️ Total duration
- 📈 Average time per test

## 🔒 RLS & Authentication

Một số tests (write operations) có thể bị skip nếu:
- RLS policies yêu cầu authentication
- User chưa đăng nhập

Đây là **bình thường** và không phải lỗi. Để test write operations:
1. Authenticate trước khi chạy tests
2. Hoặc điều chỉnh RLS policies để cho phép anonymous access (không khuyến khích cho production)

## 🎯 Expected Results

**Ideal:** Tất cả read operations pass, write operations có thể skip nếu không authenticated.

**Minimum:** Database connection và read operations phải pass.

## 🐛 Troubleshooting

### Error: Missing Supabase credentials
- Kiểm tra `.env` file có `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`

### Error: Connection timeout
- Kiểm tra internet connection
- Kiểm tra Supabase project có active không

### All write tests skipped
- Đây là bình thường nếu RLS yêu cầu auth
- Để test write operations, cần authenticate trước

