"""
Verify notifications table and triggers
"""
import psycopg2

DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def verify():
    print("🔍 Verifying notifications system...\n")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Check notifications table
        print("1️⃣ Checking notifications table...")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications';
        """)
        exists = cursor.fetchone()[0]
        print(f"   {'✅' if exists else '❌'} notifications table {'exists' if exists else 'NOT FOUND'}")
        
        if exists:
            # Check columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'notifications'
                ORDER BY ordinal_position;
            """)
            print("\n   📝 Columns:")
            for col_name, data_type in cursor.fetchall():
                print(f"      • {col_name:20} {data_type}")
        
        # Check triggers
        print("\n2️⃣ Checking triggers...")
        cursor.execute("""
            SELECT t.tgname, c.relname
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE t.tgname IN ('trigger_notify_task_assignment', 'trigger_notify_report_submitted')
            AND NOT t.tgisinternal;
        """)
        triggers = cursor.fetchall()
        if triggers:
            for trig_name, table_name in triggers:
                print(f"   ✅ {trig_name} on {table_name}")
        else:
            print("   ⚠️ No triggers found")
        
        # Check functions
        print("\n3️⃣ Checking functions...")
        cursor.execute("""
            SELECT proname 
            FROM pg_proc 
            WHERE proname IN ('notify_task_assignment', 'notify_report_submitted', 'detect_late_checkin')
            AND pronamespace = 'public'::regnamespace;
        """)
        functions = cursor.fetchall()
        if functions:
            for (func_name,) in functions:
                print(f"   ✅ {func_name}()")
        else:
            print("   ⚠️ No functions found")
        
        # Check RLS policies
        print("\n4️⃣ Checking RLS policies...")
        cursor.execute("""
            SELECT polname 
            FROM pg_policy
            WHERE polrelid = 'public.notifications'::regclass::oid;
        """)
        policies = cursor.fetchall()
        if policies:
            for (pol_name,) in policies:
                print(f"   ✅ {pol_name}")
        else:
            print("   ⚠️ No policies found")
        
        print("\n✅ Verification complete!")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    verify()
