"""
Apply notifications and automation migrations to Supabase
Uses Transaction Pooler for reliable connection
"""
import os
import psycopg2
from psycopg2 import sql

# Transaction Pooler connection string
DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def main():
    print("🚀 Applying notifications system migration...")
    print(f"📍 Using Transaction Pooler")
    
    # Read migration file (new version compatible with actual schema)
    migration_path = os.path.join(os.path.dirname(__file__), "migrations", "002_notifications_system.sql")
    
    print(f"📄 Reading migration file: {migration_path}")
    with open(migration_path, "r", encoding="utf-8") as f:
        migration_sql = f.read()
    
    # Connect to database
    conn = None
    try:
        print("\n🔌 Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False  # Use transactions
        
        cursor = conn.cursor()
        
        print("📝 Executing SQL migration...")
        cursor.execute(migration_sql)
        
        # Commit transaction
        conn.commit()
        
        print("\n✅ Migration applied successfully!")
        print("\n📋 Summary:")
        print("  ✓ notifications table created")
        print("  ✓ RLS policies configured (users see own notifications only)")
        print("  ✓ Indexes created for performance")
        print("  ✓ Task assignment triggers enabled")
        print("  ✓ Daily report submission notification triggers enabled")
        print("  ✓ Late check-in detection function created (call manually)")
        
        cursor.close()
        return True
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        print(f"\n❌ Database Error: {e}")
        print(f"   Error Code: {e.pgcode}")
        print(f"   Error Details: {e.pgerror}")
        
        print("\n📌 Alternative: Manual Migration")
        print("1. Go to: https://supabase.com/dashboard/project/dqddxowyikefqcdiioyh/sql")
        print("2. Copy content from: database/migrations/001_notifications_and_automation.sql")
        print("3. Paste and run in SQL Editor")
        return False
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\n❌ Error: {e}")
        print("\n📌 Alternative: Manual Migration")
        print("1. Go to: https://supabase.com/dashboard/project/dqddxowyikefqcdiioyh/sql")
        print("2. Copy content from: database/migrations/001_notifications_and_automation.sql")
        print("3. Paste and run in SQL Editor")
        return False
        
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
