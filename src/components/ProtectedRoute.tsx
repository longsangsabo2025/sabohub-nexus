import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { SaboRole } from '@/constants/roles';
import { FullPageLoading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentRole, loading } = useAuth();

  if (loading) {
    return <FullPageLoading loadingText="Đang kiểm tra xác thực..." />;
  }

  // Check if authenticated (either Supabase Auth or Employee login)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if allowedRoles specified
  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    // Redirect staff to their limited dashboard
    if (currentRole === SaboRole.staff || currentRole === SaboRole.shiftLeader) {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

