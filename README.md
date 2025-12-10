# 🚀 SABOHUB Nexus - Web Dashboard

Giao diện web nhanh cho SABOHUB App - Hệ thống quản lý quán bida chuyên nghiệp.

**🌐 Production:** [hub.saboarena.com](https://hub.saboarena.com)  
**📦 Deployment Status:** ✅ READY TO DEPLOY

---

## ⚡ Quick Deploy (5 minutes)

```powershell
# Deploy to production now
.\deploy.ps1 -Production

# Or test with preview first
.\deploy.ps1 -Preview
```

---

## 📚 Documentation

### For Developers
- 📦 **[DEPLOY_NOW.md](./DEPLOY_NOW.md)** - TL;DR quick start
- 📖 **[Deployment Docs](./docs/deployment/)** - Complete guides
  - [DEPLOYMENT_PACKAGE_SUMMARY.md](./docs/deployment/DEPLOYMENT_PACKAGE_SUMMARY.md) - Overview
  - [DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md) - Step-by-step
  - [DNS_SETUP.md](./docs/deployment/DNS_SETUP.md) - DNS config
  - [DEPLOYMENT_CHECKLIST.md](./docs/deployment/DEPLOYMENT_CHECKLIST.md) - Checklist
  - [QUICK_DEPLOY.md](./docs/deployment/QUICK_DEPLOY.md) - Commands

### For Managers
- 👔 **[MANAGER_GUIDE.md](./docs/deployment/MANAGER_GUIDE.md)** - User manual

---

## ✨ Tính năng

- 🔐 **Authentication**: Đăng nhập/Đăng ký với Supabase Auth (Email, Google, Apple)
- 📊 **Dashboard**: Tổng quan hệ thống với thống kê real-time
- 👥 **Quản lý nhân viên**: Xem và quản lý thông tin nhân viên
- ✅ **Quản lý công việc**: Tạo, theo dõi và quản lý công việc
- ⏰ **Chấm công**: Theo dõi chấm công của nhân viên
- 📈 **Báo cáo**: Báo cáo và phân tích (đang phát triển)
- 📄 **Tài liệu**: Quản lý tài liệu (đang phát triển)
- ⚙️ **Cài đặt**: Cài đặt tài khoản và hệ thống

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool (cực nhanh!)
- **TanStack Query** - Server State Management
- **Supabase** - Backend (Auth + Database)
- **shadcn/ui** - UI Components (50+ components)
- **Tailwind CSS** - Styling
- **React Router** - Routing

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình environment variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:8080`

## 📁 Cấu trúc dự án

```
src/
├── components/
│   ├── layouts/        # Dashboard layout với sidebar
│   └── ui/             # shadcn/ui components
├── contexts/           # React contexts (Auth)
├── pages/
│   ├── auth/           # Login, Signup
│   ├── dashboard/     # Dashboard chính
│   ├── employees/     # Quản lý nhân viên
│   ├── tasks/         # Quản lý công việc
│   ├── attendance/    # Chấm công
│   ├── reports/       # Báo cáo
│   ├── documents/     # Tài liệu
│   └── settings/      # Cài đặt
├── lib/
│   └── supabase.ts    # Supabase client
└── App.tsx            # Main app với routing
```

## 🔗 Tích hợp với SABOHUB App

Web dashboard này chia sẻ cùng Supabase backend với Flutter app (`sabohub-app`), cho phép:
- Đồng bộ dữ liệu real-time
- Chia sẻ authentication
- Quản lý từ web và mobile

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## 🚢 Deployment

### Vercel (Recommended)

1. Push code lên GitHub
2. Import project vào Vercel
3. Thêm environment variables
4. Deploy!

### Manual Build

```bash
npm run build
# Output trong folder dist/
```

## 📚 Documentation

Xem thêm trong folder `_DOCS/`:
- `_DOCS/01-ARCHITECTURE/SYSTEM_ARCHITECTURE.md` - Kiến trúc hệ thống
- `_DOCS/02-FEATURES/CORE_FEATURES.md` - Tính năng chi tiết
- `_DOCS/05-GUIDES/QUICK_START.md` - Hướng dẫn chi tiết

## 🎯 Roadmap

- [ ] Hoàn thiện tính năng Reports với charts
- [ ] Tích hợp Google Drive cho Documents
- [ ] Real-time notifications
- [ ] Role-based access control (CEO, Manager, Staff)
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive improvements

## 📄 License

Private - SABOHUB Ecosystem
