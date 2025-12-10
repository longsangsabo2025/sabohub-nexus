import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database types
// Note: These types match the actual Supabase schema from Flutter app
// If schema differs, update accordingly
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
      };
      employees: {
        Row: {
          id: string;
          company_id: string | null;
          email: string;
          full_name: string | null; // Some schemas use 'name'
          name?: string; // Alternative column name
          role: 'ceo' | 'manager' | 'shift_leader' | 'staff';
          created_at: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          company_id: string | null;
          branch_id?: string | null;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          category: string | null;
          assigned_to?: string | null;
          assignee_id?: string | null; // Alternative column name
          created_by?: string | null;
          created_at: string;
          updated_at?: string;
          due_date?: string | null;
          deadline?: string | null; // Alternative column name
        };
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          check_in_time: string;
          check_out_time?: string | null;
          location?: string | null;
          created_at: string;
        };
      };
    };
  };
};

