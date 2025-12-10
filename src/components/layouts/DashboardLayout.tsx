import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Clock,
  Calendar,
  FileText,
  Target,
  BarChart3,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Heart,
  Layout,
  Lightbulb,
  Workflow,
  Bell,
  FileSpreadsheet,
  GitBranch,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // If undefined, all roles can see
}

// Full navigation items with role restrictions
const allNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'CEO Dashboard', href: '/ceo/dashboard', icon: LayoutDashboard, roles: ['ceo'] },
  { title: 'AI Assistant', href: '/ai-assistant', icon: Bot, roles: ['ceo'] },
  { title: 'Custom Dashboard', href: '/custom-dashboard', icon: Layout, roles: ['ceo'] },
  { title: 'Strategic KPI', href: '/strategic-kpi', icon: Target, roles: ['ceo', 'manager'] },
  { title: 'OKR', href: '/okr', icon: Target, roles: ['ceo', 'manager'] },
  { title: 'Team Health', href: '/team-health', icon: Heart, roles: ['ceo', 'manager'] },
  { title: 'AI Insights', href: '/insights', icon: Lightbulb, roles: ['ceo', 'manager'] },
  { title: 'Automation', href: '/automation', icon: Workflow, roles: ['ceo', 'manager'] },
  { title: 'Auto Reports', href: '/automated-reports', icon: FileSpreadsheet, roles: ['ceo', 'manager'] },
  { title: 'Business Process', href: '/business-processes', icon: GitBranch, roles: ['ceo', 'manager'] },
  { title: 'Notifications', href: '/smart-notifications', icon: Bell },
  { title: 'Phê duyệt', href: '/approvals', icon: FileCheck, roles: ['ceo', 'manager'] },
  { title: 'Tài chính', href: '/financial', icon: DollarSign, roles: ['ceo'] },
  { title: 'Nhân viên', href: '/employees', icon: Users, roles: ['ceo', 'manager'] },
  { title: 'Công việc', href: '/tasks', icon: CheckSquare },
  { title: 'Chấm công', href: '/attendance', icon: Clock },
  { title: 'Lịch làm việc', href: '/schedules', icon: Calendar },
  { title: 'Báo cáo ngày', href: '/daily-reports', icon: FileCheck },
  { title: 'KPI', href: '/kpi', icon: Target },
  { title: 'Thống kê', href: '/reports', icon: BarChart3, roles: ['ceo', 'manager'] },
  { title: 'Tài liệu', href: '/documents', icon: FileText },
  { title: 'Cài đặt', href: '/settings', icon: Settings, roles: ['ceo', 'manager'] },
];

// Staff-specific navigation (simpler menu)
const staffNavItems: NavItem[] = [
  { title: 'Trang chính', href: '/staff/dashboard', icon: LayoutDashboard },
  { title: 'Công việc', href: '/tasks', icon: CheckSquare },
  { title: 'Chấm công', href: '/attendance', icon: Clock },
  { title: 'Lịch làm việc', href: '/schedules', icon: Calendar },
  { title: 'Báo cáo ngày', href: '/daily-reports', icon: FileCheck },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, employeeUser, currentRole, signOut, logoutEmployee, isAuthenticated } = useAuth();

  // Get filtered nav items based on role
  const navItems = useMemo(() => {
    if (!currentRole) return allNavItems;
    
    // Staff and shift leaders get simplified menu
    if (currentRole === 'staff' || currentRole === 'shift_leader') {
      return staffNavItems;
    }
    
    // Filter items by role for managers/CEOs
    return allNavItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(currentRole);
    });
  }, [currentRole]);

  const handleSignOut = async () => {
    if (employeeUser) {
      // Employee logout - just clear local state
      logoutEmployee();
      navigate('/staff-login');
    } else {
      // Supabase auth logout
      await signOut();
      navigate('/');
    }
  };

  // Get display name and initials
  const displayName = employeeUser?.full_name || user?.email || 'User';
  const userInitials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Get role badge
  const getRoleBadge = () => {
    const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ceo: { label: 'CEO', variant: 'destructive' },
      manager: { label: 'Quản lý', variant: 'default' },
      shift_leader: { label: 'Ca trưởng', variant: 'secondary' },
      staff: { label: 'Nhân viên', variant: 'outline' },
    };
    const role = roleLabels[currentRole || 'staff'];
    return <Badge variant={role.variant}>{role.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              SABOHUB
            </h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.title}>
                        <Link
                          to={item.href}
                          data-testid={`nav-${item.href.replace('/', '-')}`}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          <Icon className="h-6 w-6 shrink-0" />
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 border-b bg-background px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-16 shrink-0 items-center px-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                SABOHUB
              </h1>
            </div>
            <nav className="flex flex-1 flex-col px-6 pb-4">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      return (
                        <li key={item.title}>
                          <Link
                            to={item.href}
                            data-testid={`nav-mobile-${item.href.replace(/\//g, '-')}`}
                            className={cn(
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                          >
                            <Icon className="h-6 w-6 shrink-0" />
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex-1 text-sm font-semibold leading-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            SABOHUB
          </h1>
        </div>
        <NotificationDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <div className="mt-1">{getRoleBadge()}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6 flex-1">
              {/* Breadcrumb or page title can go here */}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <NotificationDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <div className="mt-1">{getRoleBadge()}</div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

