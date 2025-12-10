# 🗄️ SABOHUB Nexus - Database Setup

## 📋 Tổng quan

Web app sử dụng **cùng Supabase database** với Flutter app (`sabohub-app`). Database đã được setup sẵn từ Flutter app, nhưng cần đảm bảo schema tương thích với web app.

## ✅ Database đã có sẵn

Từ Flutter app, database đã có:
- ✅ `companies` (hoặc `stores`) - Công ty
- ✅ `branches` - Chi nhánh  
- ✅ `employees` - Nhân viên
- ✅ `tasks` - Công việc
- ✅ `attendance` - Chấm công
- ✅ `users` - Users (Supabase Auth)
- ✅ RLS Policies đã được cấu hình
- ✅ Indexes cho performance

## 🔧 Setup cho Web App

### Bước 1: Verify Schema

Chạy script kiểm tra schema:

```sql
-- Trong Supabase SQL Editor
-- File: database/verify-schema.sql
```

Script này sẽ:
- Kiểm tra các tables cần thiết có tồn tại không
- Hiển thị cấu trúc columns
- Kiểm tra RLS status

### Bước 2: Apply Web App Schema

Nếu thiếu columns hoặc cần điều chỉnh:

```sql
-- Trong Supabase SQL Editor  
-- File: database/web-app-schema.sql
```

Script này sẽ:
- Thêm missing columns (nếu cần)
- Tạo indexes cho performance
- Đảm bảo RLS policies cơ bản
- **KHÔNG xóa dữ liệu hiện có**

## 📊 Tables Structure

### Employees Table
```sql
- id (UUID, PK)
- email (TEXT)
- full_name (TEXT) -- hoặc 'name'
- role (TEXT) -- 'ceo', 'manager', 'shift_leader', 'staff'
- company_id (UUID, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Tasks Table
```sql
- id (UUID, PK)
- title (TEXT)
- description (TEXT)
- status (TEXT) -- 'pending', 'in_progress', 'completed', 'cancelled'
- priority (TEXT) -- 'low', 'medium', 'high', 'urgent'
- category (TEXT)
- due_date (TIMESTAMPTZ) -- hoặc 'deadline'
- created_by (UUID)
- company_id (UUID, nullable)
- branch_id (UUID, nullable)
- assigned_to (UUID, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Attendance Table
```sql
- id (UUID, PK)
- employee_id (UUID)
- check_in_time (TIMESTAMPTZ)
- check_out_time (TIMESTAMPTZ, nullable)
- location (TEXT, nullable)
- created_at (TIMESTAMPTZ)
```

## 🔒 RLS Policies

Web app cần các RLS policies cơ bản:

1. **Employees**: Authenticated users có thể đọc
2. **Tasks**: 
   - Authenticated users có thể đọc
   - Authenticated users có thể tạo/sửa/xóa (hoặc theo role)
3. **Attendance**: Authenticated users có thể đọc

**Lưu ý**: Flutter app đã có RLS policies phức tạp hơn (role-based). Web app sẽ sử dụng policies đó nếu có, hoặc fallback về basic policies.

## 🚀 Quick Setup

1. **Kiểm tra database đã setup chưa:**
   ```sql
   -- Chạy verify-schema.sql
   ```

2. **Nếu thiếu gì, chạy:**
   ```sql
   -- Chạy web-app-schema.sql
   ```

3. **Test connection từ web app:**
   - Mở web app: http://localhost:8080
   - Đăng nhập
   - Kiểm tra Dashboard có load được data không

## ⚠️ Lưu ý

- **KHÔNG chạy migration nếu database đã có data** - chỉ chạy verify trước
- **Backup database** trước khi chạy bất kỳ migration nào
- **Test trên staging** trước khi apply lên production
- Web app và Flutter app **chia sẻ cùng database** - cẩn thận với migrations

## 📝 Migration từ Flutter App

Nếu Flutter app đã có migrations, web app sẽ tự động tương thích vì:
- Cùng Supabase project
- Cùng database schema
- Cùng RLS policies

Chỉ cần đảm bảo:
- ✅ Supabase URL và keys đúng
- ✅ Tables có đủ columns web app cần
- ✅ RLS policies cho phép authenticated access

## 🎯 Kết luận

**Database backend đã sẵn sàng!** 

Flutter app đã setup đầy đủ:
- ✅ Tables
- ✅ RLS Policies  
- ✅ Indexes
- ✅ Functions & Triggers

Web app chỉ cần:
- ✅ Verify schema (optional)
- ✅ Đảm bảo columns tương thích (nếu cần)
- ✅ Test connection

**Không cần setup database mới!** 🎉

