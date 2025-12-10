"""
Create task_comments table for task collaboration
"""
import psycopg2

DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def create_task_comments_table():
    print("🚀 Creating task_comments table...\n")
    
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()
    
    try:
        # Create task_comments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.task_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
                user_id UUID NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
            CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);
            
            -- Enable RLS
            ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
            
            -- Users can view comments on tasks they can access
            CREATE POLICY "users_view_task_comments"
                ON public.task_comments
                FOR SELECT
                USING (
                    task_id IN (
                        SELECT id FROM public.tasks
                        WHERE assigned_to = auth.uid() 
                        OR created_by = auth.uid()
                        OR company_id IN (
                            SELECT company_id FROM public.employees WHERE id = auth.uid()
                        )
                    )
                );
            
            -- Users can insert comments on tasks they can access
            CREATE POLICY "users_insert_task_comments"
                ON public.task_comments
                FOR INSERT
                WITH CHECK (
                    task_id IN (
                        SELECT id FROM public.tasks
                        WHERE assigned_to = auth.uid() 
                        OR created_by = auth.uid()
                        OR company_id IN (
                            SELECT company_id FROM public.employees WHERE id = auth.uid()
                        )
                    )
                );
            
            -- Users can update their own comments
            CREATE POLICY "users_update_own_comments"
                ON public.task_comments
                FOR UPDATE
                USING (user_id = auth.uid());
            
            -- Users can delete their own comments
            CREATE POLICY "users_delete_own_comments"
                ON public.task_comments
                FOR DELETE
                USING (user_id = auth.uid());
            
            -- Create trigger to update updated_at
            CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON public.task_comments;
            CREATE TRIGGER trigger_task_comments_updated_at
                BEFORE UPDATE ON public.task_comments
                FOR EACH ROW
                EXECUTE FUNCTION update_task_comments_updated_at();
        """)
        
        conn.commit()
        
        print("✅ task_comments table created successfully!")
        print("\n📋 Features:")
        print("  ✓ Table created with foreign key to tasks")
        print("  ✓ Indexes for performance")
        print("  ✓ RLS policies (users see comments on accessible tasks)")
        print("  ✓ Auto-update updated_at timestamp")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_task_comments_table()
