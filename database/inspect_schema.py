"""
Inspect complete Supabase database schema
"""
import psycopg2
from psycopg2 import sql

DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def inspect_schema():
    print("🔍 Inspecting Supabase database schema...\n")
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Get all user tables
        print("=" * 80)
        print("📊 ALL TABLES IN PUBLIC SCHEMA")
        print("=" * 80)
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        for (table_name,) in tables:
            print(f"\n{'=' * 80}")
            print(f"📋 TABLE: {table_name}")
            print('=' * 80)
            
            # Get columns
            cursor.execute("""
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = cursor.fetchall()
            print("\n📝 COLUMNS:")
            for col_name, data_type, nullable, default, max_length in columns:
                null_str = "NULL" if nullable == "YES" else "NOT NULL"
                default_str = f" DEFAULT {default}" if default else ""
                length_str = f"({max_length})" if max_length else ""
                print(f"  • {col_name:30} {data_type}{length_str:20} {null_str:10} {default_str}")
            
            # Get indexes
            cursor.execute("""
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                AND tablename = %s
                ORDER BY indexname;
            """, (table_name,))
            
            indexes = cursor.fetchall()
            if indexes:
                print("\n🔑 INDEXES:")
                for idx_name, idx_def in indexes:
                    print(f"  • {idx_name}")
            
            # Get foreign keys
            cursor.execute("""
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = %s;
            """, (table_name,))
            
            fkeys = cursor.fetchall()
            if fkeys:
                print("\n🔗 FOREIGN KEYS:")
                for fk_name, col, ref_table, ref_col in fkeys:
                    print(f"  • {col} → {ref_table}({ref_col})")
            
            # Check RLS status
            cursor.execute("""
                SELECT relrowsecurity 
                FROM pg_class 
                WHERE relname = %s 
                AND relnamespace = 'public'::regnamespace;
            """, (table_name,))
            
            rls_result = cursor.fetchone()
            if rls_result:
                rls_enabled = rls_result[0]
                print(f"\n🔒 RLS: {'✅ ENABLED' if rls_enabled else '❌ DISABLED'}")
            
            # Get RLS policies
            cursor.execute("""
                SELECT 
                    polname,
                    polcmd
                FROM pg_policy
                WHERE polrelid = %s::regclass::oid;
            """, (f'public.{table_name}',))
            
            policies = cursor.fetchall()
            if policies:
                print("\n📜 RLS POLICIES:")
                for pol_name, pol_cmd in policies:
                    cmd_map = {'r': 'SELECT', 'a': 'INSERT', 'w': 'UPDATE', 'd': 'DELETE', '*': 'ALL'}
                    cmd = cmd_map.get(pol_cmd, pol_cmd)
                    print(f"  • {pol_name} ({cmd})")
        
        # Get all functions/triggers
        print(f"\n{'=' * 80}")
        print("⚡ TRIGGERS")
        print('=' * 80)
        cursor.execute("""
            SELECT 
                t.tgname AS trigger_name,
                c.relname AS table_name,
                p.proname AS function_name
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_proc p ON t.tgfoid = p.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public'
            AND NOT t.tgisinternal
            ORDER BY c.relname, t.tgname;
        """)
        
        triggers = cursor.fetchall()
        if triggers:
            for trig_name, table_name, func_name in triggers:
                print(f"  • {table_name}.{trig_name} → {func_name}()")
        else:
            print("  (No triggers found)")
        
        # Get custom functions
        print(f"\n{'=' * 80}")
        print("🔧 CUSTOM FUNCTIONS")
        print('=' * 80)
        cursor.execute("""
            SELECT 
                p.proname AS function_name,
                pg_get_function_result(p.oid) AS return_type,
                pg_get_function_arguments(p.oid) AS arguments
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.prokind = 'f'
            ORDER BY p.proname;
        """)
        
        functions = cursor.fetchall()
        if functions:
            for func_name, return_type, arguments in functions:
                args_str = arguments if arguments else ""
                print(f"  • {func_name}({args_str}) → {return_type}")
        else:
            print("  (No custom functions found)")
        
        print(f"\n{'=' * 80}")
        print("✅ Schema inspection complete!")
        print('=' * 80)
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    inspect_schema()
