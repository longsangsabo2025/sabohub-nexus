# 🚀 SABOHUB Nexus - Quick Start Guide

> **Project:** sabohub-nexus v0.0.0  
> **Prerequisites:** Node.js 18+, pnpm/npm/bun  
> **Time:** ~5 minutes

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Package manager (npm, pnpm, or bun)
- ✅ Git
- ✅ Supabase account (for backend)

---

## ⚡ Quick Setup

### 1. Clone & Navigate
```powershell
# Navigate to project
cd "D:\0.PROJECTS\02-SABO-ECOSYSTEM\sabo-hub\sabohub-nexus"
```

### 2. Install Dependencies
```powershell
# Using npm
npm install

# Or using pnpm (recommended)
pnpm install

# Or using bun (fastest)
bun install
```

### 3. Environment Setup
```powershell
# Copy environment template
Copy-Item .env.example .env.development

# Edit with your Supabase credentials
code .env.development
```

### 4. Configure Environment Variables
```env
# .env.development
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start Development Server
```powershell
# Start dev server
npm run dev

# Or with pnpm
pnpm dev
```

### 6. Open in Browser
```
http://localhost:5173
```

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |

---

## 🔧 Tech Stack Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                    SABOHUB NEXUS STACK                          │
├─────────────────────────────────────────────────────────────────┤
│  Framework:     React 18.3.1                                    │
│  Language:      TypeScript 5.8.3                                │
│  Build:         Vite 5.4.19                                     │
│  Styling:       TailwindCSS 3.4.17                              │
│  UI:            Radix UI (27 components)                        │
│  State:         TanStack Query 5.83.0                           │
│  Forms:         React Hook Form 7.61.1 + Zod 3.25.76            │
│  Charts:        Recharts 2.15.4                                 │
│  Animation:     Framer Motion 12.23.24                          │
│  Routing:       React Router 6.30.1                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
sabohub-nexus/
├── src/
│   ├── components/        # UI Components
│   │   ├── ui/            # shadcn/ui components
│   │   └── features/      # Feature-specific components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── services/          # API services
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── public/                # Static assets
├── _DOCS/                 # Documentation
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

---

## 🔐 Authentication

The app uses Supabase Auth. After setting up:

1. **Sign up/Login** through the app
2. **Role-based access:**
   - CEO: Full access
   - Manager: Branch-specific
   - Employee: Limited access

---

## 🧪 Running Tests

```powershell
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 🏗️ Building for Production

```powershell
# Production build
npm run build

# Preview production build locally
npm run preview
```

Build output will be in `dist/` folder.

---

## 🚀 Deployment

### Vercel (Recommended)
```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Deployment
1. Run `npm run build`
2. Upload `dist/` to any static hosting

---

## 🔗 Related Projects

| Project | Description | Path |
|---------|-------------|------|
| **SABOHUB App** | Flutter mobile app | `../sabohub-app/SABOHUB/` |
| **SABO Arena** | Gaming platform | `../../sabo-arena/` |

---

## ❓ Troubleshooting

### Common Issues

**Port already in use:**
```powershell
# Kill process on port 5173
npx kill-port 5173
```

**Dependencies issues:**
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

**TypeScript errors:**
```powershell
# Restart TS server in VS Code
Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com/)

---

*Quick Start Guide - Generated 06/2025*
