import { ReactNode, useMemo, useState } from 'react';
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
  AlertTriangle,
  Zap,
  Building2,
  Package,
  Warehouse,
  ShoppingCart,
  CreditCard,
  Truck,
  Factory,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { OdoriNotificationCenter } from '@/components/modules/OdoriNotificationCenter';
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

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  roles?: UserRole[];
}

// Grouped navigation structure
const navigationGroups: (NavItem | NavGroup)[] = [
  { title: 'Trang chủ', href: '/dashboard', icon: LayoutDashboard },
  { title: 'CEO Dashboard', href: '/ceo/dashboard', icon: LayoutDashboard, roles: ['ceo'] },
  
  // Core Operations Group
  {
    title: 'Vận hành',
    icon: Zap,
    items: [
      { title: 'TT Vận hành', href: '/operations', icon: Zap, roles: ['ceo', 'manager'] },
      { title: 'Nhân viên', href: '/employees', icon: Users, roles: ['ceo', 'manager'] },
      { title: 'Công việc', href: '/tasks', icon: CheckSquare },
      { title: 'AI Task Delegator', href: '/ai-task-delegator', icon: Bot, roles: ['ceo', 'manager'] },
      { title: 'Chấm công', href: '/attendance', icon: Clock },
      { title: 'Lịch làm việc', href: '/schedules', icon: Calendar },
      { title: 'Báo cáo ngày', href: '/daily-reports', icon: FileCheck },
    ],
  },
  
  // Analytics & Reports Group
  {
    title: 'Phân tích & Báo cáo',
    icon: BarChart3,
    roles: ['ceo', 'manager'],
    items: [
      { title: 'KPI Dashboard', href: '/kpi', icon: Target },
      { title: 'Strategic KPI', href: '/strategic-kpi', icon: Target, roles: ['ceo', 'manager'] },
      { title: 'OKR Tracking', href: '/okr', icon: Target, roles: ['ceo', 'manager'] },
      { title: 'Thống kê', href: '/reports', icon: BarChart3, roles: ['ceo', 'manager'] },
      { title: 'Báo cáo tổng hợp', href: '/executive-reports', icon: FileSpreadsheet, roles: ['ceo', 'manager'] },
      { title: 'AI Insights', href: '/insights', icon: Lightbulb, roles: ['ceo', 'manager'] },
      { title: 'Team Health', href: '/team-health', icon: Heart, roles: ['ceo', 'manager'] },
    ],
  },
  
  // Financial Group
  {
    title: 'Tài chính',
    icon: DollarSign,
    roles: ['ceo', 'manager'],
    items: [
      { title: 'Tài chính', href: '/financial', icon: DollarSign, roles: ['ceo', 'manager'] },
      { title: 'Phê duyệt', href: '/approvals', icon: FileCheck, roles: ['ceo', 'manager'] },
    ],
  },
  
  // B2B Sales (Odori) Group
  {
    title: 'Bán hàng B2B',
    icon: ShoppingCart,
    items: [
      { title: 'Khách hàng', href: '/customers', icon: Building2 },
      { title: 'Sản phẩm', href: '/products', icon: Package },
      { title: 'Kho hàng', href: '/inventory', icon: Warehouse },
      { title: 'Đơn hàng', href: '/orders', icon: ShoppingCart },
      { title: 'Giao hàng', href: '/deliveries', icon: Truck },
      { title: 'Công nợ phải thu', href: '/receivables', icon: CreditCard },
    ],
  },
  
  // Manufacturing (Odori) Group
  {
    title: 'Sản xuất',
    icon: Factory,
    items: [
      { title: 'Nhà cung cấp', href: '/manufacturing/suppliers', icon: Building2 },
      { title: 'Nguyên vật liệu', href: '/manufacturing/materials', icon: Package },
      { title: 'Định mức (BOM)', href: '/manufacturing/bom', icon: FileText },
      { title: 'Đơn mua hàng', href: '/manufacturing/purchase-orders', icon: ShoppingCart },
      { title: 'Lệnh sản xuất', href: '/manufacturing/production-orders', icon: Factory },
      { title: 'Công nợ phải trả', href: '/manufacturing/payables', icon: CreditCard },
    ],
  },
  
  // DMS (Distribution Management System) Group
  {
    title: 'Quản lý phân phối',
    icon: Truck,
    items: [
      { title: 'Cổng NPP', href: '/dms/distributor-portal', icon: Building2 },
      { title: 'Bảng giá', href: '/dms/price-lists', icon: FileText },
      { title: 'Phân tích Sell-Through', href: '/dms/sell-through', icon: BarChart3 },
      { title: 'Tuyến bán hàng', href: '/dms/sales-routes', icon: Truck },
      { title: 'Hệ thống tài khoản', href: '/dms/accounting/chart-of-accounts', icon: FileSpreadsheet },
      { title: 'Bút toán', href: '/dms/accounting/journal-entries', icon: FileCheck },
    ],
  },
  
  // Automation & AI Group
  {
    title: 'Tự động hóa & AI',
    icon: Bot,
    roles: ['ceo', 'manager'],
    items: [
      { title: 'Workflow Automation', href: '/automation', icon: Workflow, roles: ['ceo', 'manager'] },
      { title: 'CEO Assistant', href: '/ai-assistant', icon: Bot, roles: ['ceo'] },
      { title: 'Business Process', href: '/business-processes', icon: GitBranch, roles: ['ceo', 'manager'] },
      { title: 'Auto Reports', href: '/automated-reports', icon: FileSpreadsheet, roles: ['ceo', 'manager'] },
      { title: 'Smart Notifications', href: '/smart-notifications', icon: Bell },
      { title: 'Custom Dashboard', href: '/custom-dashboard', icon: Layout, roles: ['ceo'] },
    ],
  },
  
  // Specialized Apps Group
  {
    title: 'Ứng dụng chuyên biệt',
    icon: Target,
    roles: ['ceo', 'manager'],
    items: [
      { title: 'SABO Billiards', href: '/sabo-billiards', icon: Target, roles: ['ceo', 'manager'] },
      { title: 'Tài liệu', href: '/documents', icon: FileText },
      { title: 'Báo cáo lỗi', href: '/bug-reports', icon: AlertTriangle },
    ],
  },
  
  { title: 'Cài đặt', href: '/settings', icon: Settings, roles: ['ceo', 'manager'] },
];

// Staff-specific navigation (simpler menu)
const staffNavItems: NavItem[] = [
  { title: 'Trang chính', href: '/staff/dashboard', icon: LayoutDashboard },
  { title: 'Ca trưởng', href: '/shift-leader', icon: Users, roles: ['shift_leader', 'manager', 'ceo'] },
  { title: 'Công việc', href: '/tasks', icon: CheckSquare },
  { title: 'Chấm công', href: '/attendance', icon: Clock },
  { title: 'Lịch làm việc', href: '/schedules', icon: Calendar },
  { title: 'Báo cáo ngày', href: '/daily-reports', icon: FileCheck },
  { title: 'Báo cáo lỗi', href: '/bug-reports', icon: AlertTriangle },
];

// Helper to check if NavItem or NavGroup is accessible
const isAccessible = (item: NavItem | NavGroup, role: UserRole | null): boolean => {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
};

// Helper to filter items within a group
const filterGroupItems = (items: NavItem[], role: UserRole | null): NavItem[] => {
  return items.filter(item => isAccessible(item, role));
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, employeeUser, currentRole, signOut, logoutEmployee, isAuthenticated } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupTitle)) {
        next.delete(groupTitle);
      } else {
        next.add(groupTitle);
      }
      return next;
    });
  };

  // Get filtered nav items based on role
  const filteredNavigation = useMemo(() => {
    if (!currentRole) return navigationGroups;
    
    // Staff and shift leaders get simplified menu
    if (currentRole === 'staff' || currentRole === 'shift_leader') {
      return staffNavItems;
    }
    
    // Filter groups and items by role for managers/CEOs
    return navigationGroups
      .map(item => {
        if ('items' in item) {
          // It's a NavGroup
          const filteredItems = filterGroupItems(item.items, currentRole);
          if (filteredItems.length === 0) return null;
          return { ...item, items: filteredItems };
        }
        // It's a NavItem
        return isAccessible(item, currentRole) ? item : null;
      })
      .filter((item): item is NavItem | NavGroup => item !== null);
  }, [currentRole]);

  // Define Priority Tabs per Role
  const priorityTabs = useMemo(() => {
    if (currentRole === 'ceo') {
      return ['/ceo/dashboard', '/financial', '/ai-assistant', '/reports', '/approvals'];
    }
    if (currentRole === 'manager') {
      return ['/dashboard', '/tasks', '/attendance', '/daily-reports', '/operations'];
    }
    return ['/staff/dashboard', '/tasks', '/attendance', '/daily-reports'];
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
    const role = roleLabels[currentRole || 'staff'] || roleLabels.staff;
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
                  {Array.isArray(filteredNavigation) && filteredNavigation.map((item) => {
                    // Check if it's a group or single item
                    if ('items' in item) {
                      // It's a NavGroup
                      const Icon = item.icon;
                      const isExpanded = expandedGroups.has(item.title);
                      const hasActiveItem = item.items.some(subItem => location.pathname === subItem.href);
                      
                      return (
                        <li key={item.title}>
                          <button
                            onClick={() => toggleGroup(item.title)}
                            className={cn(
                              'w-full group flex items-center justify-between gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                              hasActiveItem
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                          >
                            <div className="flex items-center gap-x-3">
                              <Icon className="h-6 w-6 shrink-0" />
                              {item.title}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {isExpanded && (
                            <ul className="ml-6 mt-1 space-y-1">
                              {item.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const isActive = location.pathname === subItem.href;
                                const isPriority = priorityTabs.includes(subItem.href);
                                
                                return (
                                  <li key={subItem.title}>
                                    <Link
                                      to={subItem.href}
                                      data-testid={`nav-${subItem.href.replace(/\//g, '-')}`}
                                      className={cn(
                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-all duration-200',
                                        isActive
                                          ? 'bg-primary text-primary-foreground shadow-md'
                                          : isPriority 
                                            ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-900 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 shadow-sm' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                      )}
                                    >
                                      <SubIcon className={cn("h-5 w-5 shrink-0", isPriority && !isActive && "text-violet-600")} />
                                      {subItem.title}
                                      {isPriority && !isActive && (
                                        <span className="ml-auto h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    } else {
                      // It's a NavItem
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      const isPriority = priorityTabs.includes(item.href);
                      
                      return (
                        <li key={item.title}>
                          <Link
                            to={item.href}
                            data-testid={`nav-${item.href.replace(/\//g, '-')}`}
                            className={cn(
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : isPriority 
                                  ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-900 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 shadow-sm' 
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                          >
                            <Icon className={cn("h-6 w-6 shrink-0", isPriority && !isActive && "text-violet-600")} />
                            {item.title}
                            {isPriority && !isActive && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
                            )}
                          </Link>
                        </li>
                      );
                    }
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
                    {Array.isArray(filteredNavigation) && filteredNavigation.map((item) => {
                      // Check if it's a group or single item
                      if ('items' in item) {
                        // It's a NavGroup
                        const Icon = item.icon;
                        const isExpanded = expandedGroups.has(item.title);
                        const hasActiveItem = item.items.some(subItem => location.pathname === subItem.href);
                        
                        return (
                          <li key={item.title}>
                            <button
                              onClick={() => toggleGroup(item.title)}
                              className={cn(
                                'w-full group flex items-center justify-between gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                                hasActiveItem
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                              )}
                            >
                              <div className="flex items-center gap-x-3">
                                <Icon className="h-6 w-6 shrink-0" />
                                {item.title}
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {isExpanded && (
                              <ul className="ml-6 mt-1 space-y-1">
                                {item.items.map((subItem) => {
                                  const SubIcon = subItem.icon;
                                  const isActive = location.pathname === subItem.href;
                                  const isPriority = priorityTabs.includes(subItem.href);
                                  
                                  return (
                                    <li key={subItem.title}>
                                      <Link
                                        to={subItem.href}
                                        data-testid={`nav-mobile-${subItem.href.replace(/\//g, '-')}`}
                                        className={cn(
                                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-all duration-200',
                                          isActive
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : isPriority 
                                              ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-900 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 shadow-sm' 
                                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                        )}
                                      >
                                        <SubIcon className={cn("h-5 w-5 shrink-0", isPriority && !isActive && "text-violet-600")} />
                                        {subItem.title}
                                        {isPriority && !isActive && (
                                          <span className="ml-auto h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
                                        )}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      } else {
                        // It's a NavItem
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        const isPriority = priorityTabs.includes(item.href);

                        return (
                          <li key={item.title}>
                            <Link
                              to={item.href}
                              data-testid={`nav-mobile-${item.href.replace(/\//g, '-')}`}
                              className={cn(
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : isPriority 
                                    ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-900 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                              )}
                            >
                              <Icon className={cn("h-6 w-6 shrink-0", isPriority && !isActive && "text-violet-600")} />
                              {item.title}
                              {isPriority && !isActive && (
                                <span className="ml-auto h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
                              )}
                            </Link>
                          </li>
                        );
                      }
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
              <OdoriNotificationCenter />
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

