# ✨ SABOHUB Nexus - Core Features

> **Project:** sabohub-nexus v0.0.0  
> **Type:** Web Dashboard Features  
> **Based on:** Package dependencies & common dashboard patterns

---

## 📊 Feature Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   SABOHUB NEXUS FEATURES                        │
├───────────────────┬───────────────────┬─────────────────────────┤
│    Dashboard      │   Management      │      Reporting          │
├───────────────────┼───────────────────┼─────────────────────────┤
│ • Overview KPIs   │ • Staff List      │ • Revenue Charts        │
│ • Real-time Data  │ • Branch Config   │ • Performance Reports   │
│ • Quick Actions   │ • Task Overview   │ • Export Features       │
│ • Notifications   │ • User Roles      │ • Date Range Filters    │
└───────────────────┴───────────────────┴─────────────────────────┘
```

---

## 1️⃣ Dashboard & Analytics

### KPI Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                    TODAY'S OVERVIEW                             │
├────────────────┬────────────────┬────────────────┬──────────────┤
│   Revenue      │   Customers    │    Staff       │   Tables     │
│   2.5M VND     │     45         │    8 Active    │   12/15      │
│   ↑ 12%        │   ↑ 8%         │   1 Late       │   80%        │
└────────────────┴────────────────┴────────────────┴──────────────┘
```

**Tech Used:**
- `recharts` - Interactive charts
- `@tanstack/react-query` - Real-time data fetching
- `framer-motion` - Animated number transitions

### Charts & Visualizations
- 📈 Revenue trend line charts
- 📊 Customer bar charts
- 🥧 Revenue breakdown pie charts
- 📉 Comparison charts (vs last period)

---

## 2️⃣ Staff Management

### Employee Overview
| Feature | Description | Status |
|---------|-------------|--------|
| Staff List | View all employees | ✅ |
| Role Management | CEO/Manager/Employee | ✅ |
| Attendance History | Check-in/out records | ✅ |
| Performance | Task completion rates | 🔄 |

### Permission System
```
CEO
 ├── Full access to all branches
 ├── Can manage managers
 └── Financial reports access

Manager
 ├── Branch-specific access
 ├── Staff management
 └── Task assignment

Employee
 └── Personal dashboard only
```

---

## 3️⃣ Task Management

### Task Board
```
┌───────────────────────────────────────────────────────────┐
│  📋 Task Board                           [+ New Task]      │
├─────────────┬──────────────┬─────────────┬────────────────┤
│   To Do     │  In Progress │  Completed  │   Overdue      │
│     5       │      3       │     12      │      1         │
├─────────────┼──────────────┼─────────────┼────────────────┤
│ • Clean     │ • Stock      │ • Setup     │ • Monthly      │
│   tables    │   check      │   lighting  │   report       │
│ • Order     │ • Staff      │ • ...       │                │
│   supplies  │   training   │             │                │
└─────────────┴──────────────┴─────────────┴────────────────┘
```

**UI Components Used:**
- `@radix-ui/react-tabs` - Task status tabs
- `@radix-ui/react-dialog` - Task detail modal
- `react-hook-form` + `zod` - Task form validation
- `react-day-picker` - Due date selection

---

## 4️⃣ Reporting System

### Available Reports
| Report | Description | Format |
|--------|-------------|--------|
| Daily Revenue | Sales breakdown | Chart + Table |
| Staff Performance | Task completion | Chart |
| Customer Analytics | Visit patterns | Chart |
| Branch Comparison | Multi-branch stats | Table |

### Export Options
- 📊 Excel export
- 📄 PDF reports
- 🖨️ Print-friendly view

---

## 5️⃣ UI/UX Features

### Theme Support
```typescript
// Using next-themes for dark/light mode
import { ThemeProvider } from 'next-themes';

// Auto-detect system preference
<ThemeProvider attribute="class" defaultTheme="system">
  <App />
</ThemeProvider>
```

### Toast Notifications
```typescript
// Using sonner for toasts
import { toast } from 'sonner';

// Success notification
toast.success('Task created successfully');

// Error notification
toast.error('Failed to save changes');
```

### Form Handling
```typescript
// React Hook Form + Zod validation
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ceo', 'manager', 'employee']),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

---

## 6️⃣ Navigation & Routing

### Route Structure
```
/
├── /dashboard          # Main dashboard
├── /staff              # Staff management
│   ├── /staff/list     # Employee list
│   └── /staff/:id      # Employee detail
├── /tasks              # Task management
├── /reports            # Reports & analytics
│   ├── /reports/revenue
│   └── /reports/performance
├── /settings           # System settings
└── /profile            # User profile
```

**Tech:** `react-router-dom` v6.30.1

---

## 7️⃣ Real-time Features

### Live Updates
- 🔔 New task notifications
- 📊 Dashboard auto-refresh
- 👥 Staff status updates
- 💬 Activity feed

**Implementation:**
```typescript
// TanStack Query with refetch interval
const { data } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: fetchDashboardStats,
  refetchInterval: 30000, // 30 seconds
});
```

---

## 🔧 Component Library (Radix UI)

### Available Components
| Category | Components |
|----------|------------|
| **Overlays** | Dialog, AlertDialog, Popover, Tooltip, HoverCard |
| **Forms** | Checkbox, RadioGroup, Select, Slider, Switch |
| **Navigation** | Tabs, Menubar, NavigationMenu, DropdownMenu |
| **Layout** | Accordion, Collapsible, ScrollArea, Separator |
| **Feedback** | Progress, Toast |

---

## 📱 Responsive Design

```
Desktop (>1024px)    Tablet (768-1024px)    Mobile (<768px)
┌─────────────────┐  ┌──────────────────┐   ┌─────────────┐
│ ┌───┐ ┌───────┐│  │ ┌──┐ ┌─────────┐│   │   ☰ Menu    │
│ │Nav│ │Content││  │ │≡ │ │ Content ││   ├─────────────┤
│ │   │ │       ││  │ └──┘ │         ││   │   Content   │
│ │   │ │       ││  │      │         ││   │             │
│ └───┘ └───────┘│  │      └─────────┘│   └─────────────┘
└─────────────────┘  └──────────────────┘
```

---

## 📈 Performance Optimizations

- ⚡ Vite hot module replacement
- 🎯 Code splitting per route
- 📦 Tree-shaking unused code
- 🖼️ Lazy loading images
- 💾 TanStack Query caching

---

*Features documented based on package.json dependencies - 06/2025*
