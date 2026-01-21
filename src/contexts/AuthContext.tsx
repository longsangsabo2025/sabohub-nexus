import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SaboRole } from '@/constants/roles';

// Employee user type (from employees table, not Supabase Auth)
export interface EmployeeUser {
  id: string;
  company_id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: SaboRole;
  branch_id: string | null;
  avatar_url: string | null;
}

// User role type (alias to SaboRole for compatibility)
export type UserRole = SaboRole;

interface AuthContextType {
  // Supabase Auth user (CEO/Admin login via email)
  user: User | null;
  session: Session | null;
  
  // Employee user (Staff login via username/password)
  employeeUser: EmployeeUser | null;
  
  // Combined auth state
  isAuthenticated: boolean;
  currentRole: UserRole | null;
  loading: boolean;
  
  // Supabase Auth methods
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  
  // Employee Auth methods
  setEmployeeUser: (employee: EmployeeUser | null) => void;
  logoutEmployee: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employeeUser, setEmployeeUserState] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore employee session from localStorage
  useEffect(() => {
    const storedEmployee = localStorage.getItem('employee_user');
    if (storedEmployee) {
      try {
        const employee = JSON.parse(storedEmployee) as EmployeeUser;
        setEmployeeUserState(employee);
      } catch (e) {
        localStorage.removeItem('employee_user');
        localStorage.removeItem('employee_logged_in');
      }
    }
    // Note: Don't set loading=false here, let Supabase auth handle it
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set employee user and persist to localStorage
  const setEmployeeUser = (employee: EmployeeUser | null) => {
    setEmployeeUserState(employee);
    if (employee) {
      localStorage.setItem('employee_user', JSON.stringify(employee));
      localStorage.setItem('employee_logged_in', 'true');
    } else {
      localStorage.removeItem('employee_user');
      localStorage.removeItem('employee_logged_in');
    }
    setLoading(false);
  };

  // Computed auth state
  const isAuthenticated = !!(user || employeeUser);
  
  // Get current role from either auth system
  const getCurrentRole = (): UserRole | null => {
    if (employeeUser) {
      return employeeUser.role;
    }
    if (user) {
      // Get role from users table via user metadata or default to manager
      const role = user.user_metadata?.role || 'manager';
      return SaboRole.fromString(role);
    }
    return null;
  };
  
  const currentRole = getCurrentRole();

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear employee session
    setEmployeeUser(null);
    // Clear Supabase auth
    await supabase.auth.signOut();
  };

  // Logout employee only (for staff login)
  const logoutEmployee = () => {
    setEmployeeUser(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        employeeUser,
        isAuthenticated,
        currentRole,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithApple,
        setEmployeeUser,
        logoutEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

