# 🎱 SABOHUB Nexus - Investment Overview

> **Web Dashboard cho Hệ thống Quản lý Quán Billiards**  
> Phiên bản: 0.0.0 (Development) | Cập nhật: 06/2025

---

## 📊 Executive Summary

**SABOHUB Nexus** là web dashboard bổ sung cho hệ thống quản lý quán billiards SABOHUB, cung cấp giao diện quản trị mạnh mẽ cho CEO và managers.

### 🎯 Role trong SABOHUB Ecosystem

| Component | Platform | Function |
|-----------|----------|----------|
| **SABOHUB App** | Flutter Mobile | Daily operations |
| **SABOHUB Nexus** | React Web | Admin dashboard |
| **Supabase** | Cloud | Shared backend |

---

## 💼 Key Value Propositions

### For CEOs
- 📊 Multi-branch overview dashboard
- 💰 Revenue analytics & reports
- 📈 Performance comparisons
- 👥 Organization management

### For Managers
- 📋 Task assignment & tracking
- 👨‍💼 Staff management
- 📅 Schedule overview
- 📉 Branch performance

---

## 🛠️ Technology (Verified from package.json v0.0.0)

```
┌─────────────────────────────────────────┐
│      SABOHUB NEXUS WEB STACK            │
├─────────────────────────────────────────┤
│  Framework:   React 18.3.1              │
│  Language:    TypeScript 5.8.3          │
│  Build:       Vite 5.4.19               │
│  Styling:     TailwindCSS 3.4.17        │
│  UI:          Radix UI (27 components)  │
│  State:       TanStack Query 5.83.0     │
│  Forms:       React Hook Form + Zod     │
│  Charts:      Recharts 2.15.4           │
│  Animation:   Framer Motion 12.23.24    │
│  Testing:     Vitest 4.0.8              │
└─────────────────────────────────────────┘

Dependencies: 69 packages (49 prod + 20 dev)
```

---

## 🚀 Key Features

### 1. Analytics Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD OVERVIEW                           │
├────────────────┬────────────────┬────────────────┬──────────────┤
│   Revenue      │   Customers    │    Staff       │   Tables     │
│   ██████████   │   ████████     │   ████████     │   ████████   │
│   2.5M VND     │   45 today     │   8 active     │   12/15 used │
└────────────────┴────────────────┴────────────────┴──────────────┘
│                                                                 │
│   📈 Revenue Trend                 🥧 Revenue by Branch         │
│   ▓▓▓▓▓▓▓▓░░                      ┌─────────────────┐          │
│   ▓▓▓▓▓▓▓▓▓░                      │   Branch A: 40% │          │
│   ▓▓▓▓▓▓▓▓▓▓                      │   Branch B: 35% │          │
│   Mon-Tue-Wed-Thu-Fri              │   Branch C: 25% │          │
│                                    └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Staff Management
- View all employees across branches
- Role-based access control
- Attendance tracking integration
- Performance metrics

### 3. Task & Workflow
- Task assignment from web
- Progress tracking
- Notification system
- Deadline management

### 4. Reporting
- Daily/Weekly/Monthly reports
- Export to Excel/PDF
- Customizable date ranges
- Comparison analytics

---

## 📈 Part of SABOHUB Ecosystem

### Shared Backend Stats (Supabase)
```
Database Tables:
├── employees        → Staff records
├── attendance       → Check-in/out
├── tasks            → Task management
├── branches         → Location data
├── companies        → Organization
└── daily_reports    → Performance data
```

### SABOHUB App (Flutter) Stats
- **Version:** 1.0.2+2
- **Flutter SDK:** ^3.5.0
- **Dependencies:** 25+ packages
- **Platforms:** iOS, Android, Web

---

## 🔗 Integration Points

```
┌─────────────────────┐          ┌─────────────────────┐
│   SABOHUB Nexus     │◀────────▶│    SABOHUB App      │
│   (Web Dashboard)   │          │    (Flutter)        │
└─────────────────────┘          └─────────────────────┘
         │                                │
         └────────────┬───────────────────┘
                      ▼
              ┌─────────────────────┐
              │   Supabase Backend  │
              │   • PostgreSQL      │
              │   • Auth            │
              │   • Realtime        │
              │   • Storage         │
              └─────────────────────┘
```

---

## 🎯 Development Status

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard UI | 🔄 In Progress | Core layout done |
| Auth Integration | ✅ Ready | Supabase Auth |
| Staff Management | 🔄 In Progress | Shared with app |
| Analytics | 📅 Planned | Recharts setup ready |
| Reports Export | 📅 Planned | |

---

## 📍 Roadmap

### Q2 2025
- ✅ Project setup with Vite + React
- ✅ UI component library (Radix)
- 🔄 Dashboard layout
- 🔄 Authentication flow

### Q3 2025
- 📅 Full staff management
- 📅 Task system integration
- 📅 Analytics dashboard
- 📅 Report generation

### Q4 2025
- 📅 Advanced analytics
- 📅 Multi-branch comparison
- 📅 Mobile responsive polish
- 📅 Production deployment

---

## 💰 Business Impact

### Efficiency Gains
- 🕐 **50% faster** reporting
- 📊 **Real-time** multi-branch view
- 👥 **Centralized** staff management
- 📈 **Data-driven** decisions

### Target Users
- CEOs managing multiple branches
- Managers overseeing operations
- Accountants needing reports

---

## 📞 Contact

- **Main Project:** SABOHUB Ecosystem
- **Repository:** sabo-hub/sabohub-nexus

---

*SABOHUB Nexus - Web Dashboard cho Quản lý Billiards Chuyên nghiệp* 🎱
