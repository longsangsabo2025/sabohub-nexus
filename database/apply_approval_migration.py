"""
Apply approval_requests migration
Creates approval workflow system for CEO/Manager
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Get connection string (use transaction pooler for serverless)
DATABASE_URL = os.getenv('VITE_SUPABASE_POOLER_URL') or os.getenv('DATABASE_URL')

def apply_migration():
    """Apply the approval_requests migration"""
    
    print("🚀 Applying approval_requests migration...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        
        # Read migration file
        with open('migrations/003_approval_requests.sql', 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print("📄 Migration file loaded")
        
        # Execute migration
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration applied successfully!")
        
        # Verify table exists
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'approval_requests'
        """)
        
        if cursor.fetchone()[0] > 0:
            print("✅ approval_requests table verified")
            
            # Check row count
            cursor.execute("SELECT COUNT(*) FROM approval_requests")
            count = cursor.fetchone()[0]
            print(f"📊 Table has {count} rows")
        else:
            print("❌ Table verification failed")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("\n🎉 Migration complete!")
        print("\nNext steps:")
        print("1. Update ApprovalCenter.tsx to use real database")
        print("2. Test approval workflow")
        print("3. Add keyboard shortcuts")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise

if __name__ == '__main__':
    apply_migration()
