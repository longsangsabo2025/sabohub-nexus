import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface ProtectedFeatureProps {
  readonly children: ReactNode;
  readonly allowedRoles: Array<'ceo' | 'manager' | 'shift_leader' | 'staff'>;
  readonly fallback?: ReactNode;
}

export function ProtectedFeature({
  children,
  allowedRoles,
  fallback,
}: ProtectedFeatureProps) {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <div>Đang kiểm tra quyền...</div>;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Không có quyền truy cập
            </CardTitle>
            <CardDescription>
              Tính năng này chỉ dành cho: {allowedRoles.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vui lòng liên hệ quản trị viên để được cấp quyền.
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  return <>{children}</>;
}

