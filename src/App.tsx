import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FullPageLoading } from "@/components/ui/loading";
import { useAnalytics } from "@/lib/analytics";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { lazy, Suspense } from "react";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const StaffLogin = lazy(() => import("./pages/auth/StaffLogin"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const CEODashboard = lazy(() => import("./pages/dashboard/CEODashboard"));
const Tasks = lazy(() => import("./pages/tasks/Tasks"));
const TaskDetail = lazy(() => import("./pages/tasks/TaskDetail"));
const AITaskDelegator = lazy(() => import("./pages/tasks/AITaskDelegator"));
const Employees = lazy(() => import("./pages/employees/Employees"));
const Attendance = lazy(() => import("./pages/attendance/Attendance"));
const Schedules = lazy(() => import("./pages/schedules/Schedules"));
const DailyReports = lazy(() => import("./pages/daily-reports/DailyReports"));
const KPIDashboard = lazy(() => import("./pages/kpi/KPIDashboard"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const ExecutiveReport = lazy(() => import("./pages/reports/ExecutiveReport"));
const Documents = lazy(() => import("./pages/documents/Documents"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const BugReports = lazy(() => import("./pages/bug-reports/BugReports"));
const OperationsCenter = lazy(() => import("./pages/manager/OperationsCenter"));
const StaffDashboard = lazy(() => import("./pages/staff/StaffDashboard"));
const ApprovalCenter = lazy(() => import('./pages/approvals/ApprovalCenter'));
const FinancialTracking = lazy(() => import('./pages/financial/FinancialTracking'));
const StrategicKPI = lazy(() => import('./pages/kpi/StrategicKPI'));
const OKRTracking = lazy(() => import('./pages/okr/OKRTracking'));
const TeamHealthMonitoring = lazy(() => import('./pages/team/TeamHealthMonitoring'));
const CustomDashboardBuilder = lazy(() => import('./pages/dashboard/CustomDashboardBuilder'));

// Phase 3: Advanced Intelligence & Automation
const PerformanceInsights = lazy(() => import('./pages/insights/PerformanceInsights'));
// Temporarily use regular import to debug lazy loading issue
import WorkflowAutomation from './pages/automation/WorkflowAutomation';
const AutomatedReports = lazy(() => import('./pages/reports/AutomatedReports'));
const SmartNotifications = lazy(() => import('./components/notifications/SmartNotifications'));
const BusinessProcessFlow = lazy(() => import('./pages/processes/BusinessProcessFlow'));
const CEOAssistant = lazy(() => import('./pages/ai-assistant/CEOAssistant'));

// SABO Billiards Hub
const SaboBilliardsHub = lazy(() => import('./components/sabo-billiards/SaboBilliardsHub').then(module => ({ default: module.SaboBilliardsHub })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (replaces cacheTime)
      retry: 1,
    },
  },
});

// Analytics wrapper component
const AppWithAnalytics = () => {
  useAnalytics(); // Initialize analytics tracking
  
  return (
    <Suspense fallback={<FullPageLoading loadingText="Đang tải trang..." />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected routes with dashboard layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ceo/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ceo']}>
              <DashboardLayout>
                <CEODashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <OperationsCenter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StaffDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <Employees />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Tasks />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TaskDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-task-delegator"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <AITaskDelegator />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Attendance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Schedules />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-reports"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DailyReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kpi"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <KPIDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <Documents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bug-reports"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BugReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <ApprovalCenter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <FinancialTracking />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategic-kpi"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <StrategicKPI />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/okr"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <OKRTracking />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-health"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <TeamHealthMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/custom-dashboard"
          element={
            <ProtectedRoute allowedRoles={['ceo']}>
              <DashboardLayout>
                <CustomDashboardBuilder />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <PerformanceInsights />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/automation"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <WorkflowAutomation />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/automated-reports"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <AutomatedReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/executive-reports"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <ExecutiveReport />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SmartNotifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/business-processes"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <BusinessProcessFlow />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={['ceo']}>
              <DashboardLayout>
                <CEOAssistant />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sabo-billiards"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'manager']}>
              <DashboardLayout>
                <SaboBilliardsHub />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppWithAnalytics />
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
