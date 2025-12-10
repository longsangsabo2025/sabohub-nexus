import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  GitBranch,
  Users,
  Lock,
  CheckSquare,
  Clock,
  Calendar,
  FileText,
  Target,
  DollarSign,
  Zap,
  FileCheck,
  BarChart3,
  Smartphone,
  Map,
  Shield,
  TrendingUp,
  Workflow,
  Globe,
} from 'lucide-react';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
});

interface ProcessDiagram {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'overview' | 'user' | 'operations' | 'management' | 'technical';
  diagram: string;
}

const MermaidDiagram = ({ diagram, id }: { diagram: string; id: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = diagram;
      ref.current.appendChild(div);
      mermaid.contentLoaded();
    }
  }, [diagram]);

  return <div ref={ref} className="flex justify-center items-center p-4 bg-white rounded-lg" />;
};

const processDiagrams: ProcessDiagram[] = [
  {
    id: 'overall',
    title: 'Quy trình Tổng quan',
    description: 'Luồng nghiệp vụ chính của toàn bộ hệ thống SABOHUB',
    icon: GitBranch,
    category: 'overview',
    diagram: `graph TD
    A[🏢 COMPANY SETUP] --> B[👥 USER ONBOARDING]
    B --> C{🎭 ROLE ASSIGNMENT}
    C -->|CEO| D[📊 STRATEGIC MANAGEMENT]
    C -->|Manager| E[👔 TEAM MANAGEMENT]
    C -->|Staff/Shift Leader| F[👷 DAILY OPERATIONS]
    
    D --> G[💰 Financial Tracking]
    D --> H[📈 KPI/OKR Planning]
    D --> I[🤖 Workflow Automation]
    
    E --> J[✅ Task Assignment]
    E --> K[📅 Schedule Planning]
    E --> L[✔️ Approval Workflows]
    
    F --> M[⏰ Attendance Check-in]
    F --> N[📋 Task Execution]
    F --> O[📝 Daily Reports]
    
    M --> P[📊 REPORTS & ANALYTICS]
    N --> P
    O --> P
    J --> P
    K --> P
    
    P --> Q[🔄 CONTINUOUS IMPROVEMENT]
    Q --> H`,
  },
  {
    id: 'onboarding',
    title: 'Company Onboarding',
    description: 'Quy trình thiết lập công ty và nhân viên',
    icon: Users,
    category: 'overview',
    diagram: `flowchart LR
    A[🚀 Start] --> B[Create Company]
    B --> C[Assign CEO]
    C --> D[Create Branches]
    D --> E[Add Managers]
    E --> F[Add Employees]
    F --> G[Setup Completed]
    
    style A fill:#4ade80
    style G fill:#22c55e`,
  },
  {
    id: 'auth',
    title: 'User Authentication Flow',
    description: 'Quy trình xác thực và phân quyền người dùng',
    icon: Lock,
    category: 'user',
    diagram: `stateDiagram-v2
    [*] --> Login
    Login --> RoleCheck: Auth Success
    Login --> [*]: Auth Failed
    
    RoleCheck --> CEODashboard: role = CEO
    RoleCheck --> ManagerDashboard: role = Manager
    RoleCheck --> StaffDashboard: role = Staff/Shift Leader
    
    CEODashboard --> [*]: Logout
    ManagerDashboard --> [*]: Logout
    StaffDashboard --> [*]: Logout`,
  },
  {
    id: 'ceo-workflow',
    title: 'CEO Daily Workflow',
    description: 'Quy trình làm việc hàng ngày của CEO',
    icon: TrendingUp,
    category: 'management',
    diagram: `sequenceDiagram
    participant CEO
    participant Dashboard
    participant Financial
    participant KPI
    participant Reports
    
    CEO->>Dashboard: Login & View Overview
    Dashboard-->>CEO: Show Company Stats
    
    CEO->>Financial: Review Revenue/Expenses
    Financial-->>CEO: Financial Reports
    
    CEO->>KPI: Track Strategic Goals
    KPI-->>CEO: Progress Analytics
    
    CEO->>Reports: Generate Auto Reports
    Reports-->>CEO: Scheduled Reports
    
    CEO->>Dashboard: Make Strategic Decisions`,
  },
  {
    id: 'task-management',
    title: 'Task Management Flow',
    description: 'Quy trình quản lý và thực hiện công việc',
    icon: CheckSquare,
    category: 'operations',
    diagram: `graph TD
    A[📋 Create Task] --> B{Task Type}
    B -->|One-time| C[Set Due Date]
    B -->|Recurring| D[Set Recurrence Pattern]
    
    C --> E[Assign Employee]
    D --> E
    
    E --> F[Set Priority]
    F --> G{Priority Level}
    G -->|Urgent| H[⚠️ Immediate Notification]
    G -->|High| I[📧 Email + Push]
    G -->|Medium/Low| J[📱 Push Only]
    
    H --> K[Task Created]
    I --> K
    J --> K
    
    K --> L[Employee Receives]
    L --> M[Task Execution]
    M --> N{Status Update}
    N -->|In Progress| O[Track Progress]
    N -->|Completed| P[Manager Review]
    N -->|Blocked| Q[Request Help]
    
    O --> M
    P --> R[✅ Approve]
    Q --> S[Manager Intervention]
    S --> M`,
  },
  {
    id: 'attendance',
    title: 'Attendance Tracking',
    description: 'Quy trình chấm công GPS và quản lý giờ làm việc',
    icon: Clock,
    category: 'operations',
    diagram: `flowchart TD
    A[Employee Arrives] --> B[Open Attendance Page]
    B --> C[Click Check-in]
    C --> D{GPS Available?}
    D -->|Yes| E[Capture Location]
    D -->|No| F[Manual Entry]
    
    E --> G[Record Check-in Time]
    F --> G
    
    G --> H[Work Hours]
    
    H --> I{Break Time?}
    I -->|Yes| J[Start Break]
    J --> K[End Break]
    K --> H
    I -->|No| L[Continue Working]
    L --> H
    
    H --> M[Click Check-out]
    M --> N[Capture Location]
    N --> O[Calculate Total Hours]
    O --> P[Save Attendance Record]
    P --> Q[Generate Daily Report]
    
    style A fill:#4ade80
    style Q fill:#22c55e`,
  },
  {
    id: 'schedule',
    title: 'Schedule Management',
    description: 'Quy trình lập lịch làm việc theo ca',
    icon: Calendar,
    category: 'management',
    diagram: `graph LR
    A[Manager: Create Schedule] --> B[Select Week]
    B --> C[Assign Employees]
    C --> D{Shift Type}
    D -->|Morning| E[6:00-14:00]
    D -->|Afternoon| F[14:00-22:00]
    D -->|Night| G[22:00-6:00]
    D -->|Full Day| H[Full Day]
    
    E --> I[Add Notes]
    F --> I
    G --> I
    H --> I
    
    I --> J[Save Schedule]
    J --> K[Notify Employees]
    K --> L[Employee Views Schedule]
    
    style A fill:#3b82f6
    style L fill:#22c55e`,
  },
  {
    id: 'daily-report',
    title: 'Daily Report Submission',
    description: 'Quy trình gửi báo cáo công việc hàng ngày',
    icon: FileText,
    category: 'operations',
    diagram: `sequenceDiagram
    participant Employee
    participant System
    participant Manager
    participant CEO
    
    Employee->>System: Check-in (Morning)
    System-->>Employee: Record Start Time
    
    Employee->>System: Work on Tasks
    System-->>Employee: Track Progress
    
    Employee->>System: Check-out (Evening)
    System-->>Employee: Calculate Hours
    
    Employee->>System: Submit Daily Report
    Note over Employee,System: - Tasks completed<br/>- Achievements<br/>- Challenges<br/>- Notes
    
    System->>Manager: Notify Manager
    Manager->>System: Review Report
    Manager-->>Employee: Feedback
    
    System->>CEO: Aggregate Reports
    CEO->>System: View Analytics`,
  },
  {
    id: 'kpi-okr',
    title: 'KPI/OKR Tracking',
    description: 'Quy trình theo dõi và đánh giá mục tiêu',
    icon: Target,
    category: 'management',
    diagram: `graph TD
    A[CEO: Set Strategic OKR] --> B[Define Objectives]
    B --> C[Set Key Results]
    C --> D[Assign KPI Targets]
    
    D --> E[Manager: Cascade to Team]
    E --> F[Track Daily Progress]
    
    F --> G{Period Review}
    G -->|Weekly| H[Update Progress]
    G -->|Monthly| I[Manager Review]
    G -->|Quarterly| J[CEO Review]
    
    H --> F
    I --> K[Adjust Targets]
    J --> L{Goals Met?}
    
    K --> F
    
    L -->|Yes| M[✅ Celebrate Success]
    L -->|No| N[📊 Analyze & Improve]
    
    M --> O[Set Next Period Goals]
    N --> O
    O --> B`,
  },
  {
    id: 'financial',
    title: 'Financial Management',
    description: 'Quy trình quản lý tài chính (CEO only)',
    icon: DollarSign,
    category: 'management',
    diagram: `flowchart LR
    A[💵 Revenue] --> D[Financial Tracking]
    B[💸 Expenses] --> D
    C[📊 Transactions] --> D
    
    D --> E{Category}
    E -->|Revenue| F[Sales, Services, Other]
    E -->|Expense| G[Salary, Rent, Utilities, Other]
    
    F --> H[Record Transaction]
    G --> H
    
    H --> I[Update Balance]
    I --> J[Generate Reports]
    J --> K{Report Type}
    K -->|Daily| L[Daily Summary]
    K -->|Monthly| M[Monthly P&L]
    K -->|Yearly| N[Annual Report]
    
    L --> O[CEO Dashboard]
    M --> O
    N --> O
    
    style A fill:#22c55e
    style B fill:#ef4444
    style O fill:#3b82f6`,
  },
  {
    id: 'automation',
    title: 'Workflow Automation',
    description: 'Quy trình tự động hóa công việc',
    icon: Zap,
    category: 'technical',
    diagram: `graph TD
    A[CEO/Manager: Create Workflow] --> B{Trigger Type}
    B -->|Time-based| C[Set Schedule]
    B -->|Event-based| D[Define Event]
    
    C --> E[Configure Actions]
    D --> E
    
    E --> F{Action Type}
    F -->|Create Task| G[Task Template]
    F -->|Send Notification| H[Notification Template]
    F -->|Generate Report| I[Report Template]
    F -->|Update Data| J[Data Template]
    
    G --> K[Activate Workflow]
    H --> K
    I --> K
    J --> K
    
    K --> L{Trigger Met?}
    L -->|Yes| M[Execute Actions]
    L -->|No| L
    
    M --> N[Log Execution]
    N --> O{Success?}
    O -->|Yes| P[✅ Complete]
    O -->|No| Q[⚠️ Retry/Alert]
    
    Q --> M
    
    style K fill:#fbbf24
    style P fill:#22c55e`,
  },
  {
    id: 'approval',
    title: 'Approval Workflow',
    description: 'Quy trình phê duyệt yêu cầu',
    icon: FileCheck,
    category: 'management',
    diagram: `stateDiagram-v2
    [*] --> EmployeeRequest: Submit Request
    EmployeeRequest --> ManagerReview: Pending
    
    ManagerReview --> Approved: ✅ Approve
    ManagerReview --> Rejected: ❌ Reject
    ManagerReview --> NeedMoreInfo: 💬 Request Info
    
    NeedMoreInfo --> EmployeeRequest: Provide Info
    
    Approved --> CEOReview: High Value Request
    Approved --> [*]: Normal Request
    
    CEOReview --> FinalApproved: ✅ Approve
    CEOReview --> FinalRejected: ❌ Reject
    
    FinalApproved --> [*]
    FinalRejected --> [*]
    Rejected --> [*]`,
  },
  {
    id: 'realtime',
    title: 'Real-time Sync',
    description: 'Quy trình đồng bộ dữ liệu thời gian thực',
    icon: Globe,
    category: 'technical',
    diagram: `sequenceDiagram
    participant Browser1
    participant Supabase
    participant Browser2
    participant Browser3
    
    Browser1->>Supabase: Update Task Status
    Supabase->>Browser2: Realtime Event
    Supabase->>Browser3: Realtime Event
    
    Browser2->>Browser2: Auto Refresh UI
    Browser3->>Browser3: Auto Refresh UI
    
    Note over Browser1,Browser3: All users see updates instantly
    
    Browser2->>Supabase: Create Attendance
    Supabase->>Browser1: Realtime Event
    Supabase->>Browser3: Realtime Event`,
  },
  {
    id: 'reporting',
    title: 'Reporting & Analytics',
    description: 'Quy trình tạo và phân phối báo cáo',
    icon: BarChart3,
    category: 'management',
    diagram: `flowchart TD
    A[Data Collection] --> B[Attendance Records]
    A --> C[Task Completion]
    A --> D[Financial Transactions]
    A --> E[KPI Progress]
    
    B --> F[Data Aggregation]
    C --> F
    D --> F
    E --> F
    
    F --> G{Report Type}
    G -->|Daily| H[Daily Summary]
    G -->|Weekly| I[Weekly Trends]
    G -->|Monthly| J[Monthly Analytics]
    G -->|Custom| K[Custom Reports]
    
    H --> L[Auto-generated Reports]
    I --> L
    J --> L
    K --> L
    
    L --> M{Delivery Method}
    M -->|Email| N[📧 Email Reports]
    M -->|Dashboard| O[📊 Dashboard Widgets]
    M -->|Export| P[📄 PDF/Excel]
    
    N --> Q[📮 Scheduled Delivery]
    O --> Q
    P --> Q`,
  },
  {
    id: 'mobile-attendance',
    title: 'Mobile Attendance Flow',
    description: 'Quy trình chấm công di động với GPS',
    icon: Smartphone,
    category: 'operations',
    diagram: `graph TD
    A[📱 Mobile Device] --> B{Location Permission}
    B -->|Granted| C[Get GPS Coordinates]
    B -->|Denied| D[Manual Entry]
    
    C --> E[Check Accuracy]
    E --> F{Accurate Enough?}
    F -->|Yes| G[Record Check-in]
    F -->|No| H[Request Better Signal]
    
    H --> C
    D --> G
    
    G --> I[Store Data]
    I --> J{Network Available?}
    J -->|Yes| K[Sync to Server]
    J -->|No| L[Store Locally]
    
    L --> M[Auto Sync Later]
    M --> K
    
    K --> N[Update Dashboard]
    
    style A fill:#4ade80
    style N fill:#22c55e`,
  },
  {
    id: 'user-journey',
    title: 'Staff Daily Journey',
    description: 'Hành trình làm việc của nhân viên trong ngày',
    icon: Map,
    category: 'user',
    diagram: `journey
    title Staff Daily Journey
    section Morning
      Wake up: 3: Staff
      Check schedule: 5: Staff
      Travel to work: 3: Staff
      GPS Check-in: 5: Staff, System
    section Work Hours
      View assigned tasks: 5: Staff, System
      Complete tasks: 4: Staff
      Update progress: 5: Staff, System
      Take breaks: 3: Staff
    section Evening
      GPS Check-out: 5: Staff, System
      Submit daily report: 4: Staff, System
      Review feedback: 4: Staff, Manager
    section Night
      Receive next day schedule: 5: Staff, System`,
  },
  {
    id: 'rbac',
    title: 'Role-Based Access Control',
    description: 'Quy trình phân quyền theo vai trò',
    icon: Shield,
    category: 'technical',
    diagram: `graph TD
    A[User Login] --> B{Role Detection}
    B -->|CEO| C[CEO Menu<br/>14 Tabs]
    B -->|Manager| D[Manager Menu<br/>18 Tabs]
    B -->|Staff/Shift Leader| E[Staff Menu<br/>5 Tabs]
    
    C --> F[Financial Access ✅]
    C --> G[Strategic Tools ✅]
    C --> H[Company-wide Data ✅]
    
    D --> I[Financial Access ❌]
    D --> J[Team Management ✅]
    D --> K[Approval Tools ✅]
    
    E --> L[Own Data Only ✅]
    E --> M[Task Execution ✅]
    E --> N[Daily Reports ✅]
    
    style C fill:#fbbf24
    style D fill:#3b82f6
    style E fill:#22c55e`,
  },
  {
    id: 'integration',
    title: 'System Integration',
    description: 'Kiến trúc tích hợp hệ thống',
    icon: Workflow,
    category: 'technical',
    diagram: `graph LR
    A[Frontend<br/>React + TypeScript] --> B[API Layer<br/>React Query]
    B --> C[Supabase<br/>PostgreSQL + RLS]
    
    C --> D[Real-time<br/>WebSocket]
    C --> E[Authentication<br/>JWT]
    C --> F[Storage<br/>Documents]
    
    D --> G[Live Updates]
    E --> H[Secure Access]
    F --> I[File Management]
    
    G --> J[User Experience]
    H --> J
    I --> J
    
    style A fill:#3b82f6
    style C fill:#22c55e
    style J fill:#fbbf24`,
  },
];

export default function BusinessProcessFlow() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<ProcessDiagram>(processDiagrams[0]);

  const categories = [
    { id: 'all', label: 'Tất cả', icon: GitBranch },
    { id: 'overview', label: 'Tổng quan', icon: Map },
    { id: 'user', label: 'Người dùng', icon: Users },
    { id: 'operations', label: 'Vận hành', icon: Workflow },
    { id: 'management', label: 'Quản lý', icon: Target },
    { id: 'technical', label: 'Kỹ thuật', icon: Globe },
  ];

  const filteredProcesses =
    selectedCategory === 'all'
      ? processDiagrams
      : processDiagrams.filter((p) => p.category === selectedCategory);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Process Flow</h1>
          <p className="text-muted-foreground mt-1">
            Sơ đồ quy trình nghiệp vụ của hệ thống SABOHUB
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {processDiagrams.length} Quy trình
        </Badge>
      </div>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Danh mục quy trình</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Process Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Danh sách quy trình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[800px] overflow-y-auto">
            {filteredProcesses.map((process) => {
              const Icon = process.icon;
              return (
                <Button
                  key={process.id}
                  variant={selectedProcess.id === process.id ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => setSelectedProcess(process)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold">{process.title}</div>
                    <div className="text-xs opacity-80 line-clamp-2">
                      {process.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Process Diagram */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = selectedProcess.icon;
                return <Icon className="h-6 w-6 mt-1 flex-shrink-0" />;
              })()}
              <div className="flex-1">
                <CardTitle>{selectedProcess.title}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedProcess.description}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <MermaidDiagram
                diagram={selectedProcess.diagram}
                id={selectedProcess.id}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.slice(1).map((cat) => {
          const Icon = cat.icon;
          const count = processDiagrams.filter((p) => p.category === cat.id).length;
          return (
            <Card key={cat.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{cat.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
