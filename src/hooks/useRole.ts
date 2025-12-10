import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type UserRole = 'ceo' | 'manager' | 'shift_leader' | 'staff' | null;

export function useRole() {
  const { user } = useAuth();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee-role', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        // User might not be in employees table yet
        return null;
      }

      return data?.role as UserRole;
    },
    enabled: !!user,
  });

  return {
    role: employee || null,
    isLoading,
    isCEO: employee === 'ceo',
    isManager: employee === 'manager' || employee === 'ceo',
    isShiftLeader: employee === 'shift_leader' || employee === 'manager' || employee === 'ceo',
    isStaff: employee === 'staff' || !employee,
  };
}

