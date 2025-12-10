"""
AI Chat History Migration Runner
Tạo bảng lưu lịch sử trò chuyện với AI Assistant
"""

import os
import psycopg2

# Transaction Pooler connection string
DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def run_migration():
    """Execute chat history migration"""
    print("🤖 AI CHAT HISTORY MIGRATION")
    print("=" * 50)
    
    conn = None
    try:
        # Read SQL file
        sql_path = os.path.join(os.path.dirname(__file__), '012_ai_chat_history.sql')
        print(f"📄 Reading: {sql_path}")
        with open(sql_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        print("✅ SQL file loaded")
        
        # Connect to database
        print("\n🔌 Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        print("✅ Connected to Supabase")
        
        # Execute migration
        print("\n🚀 Creating ai_chat_history table...")
        cursor.execute(sql)
        conn.commit()
        print("✅ Migration executed")
        
        # Verify table creation
        print("\n📊 VERIFICATION:")
        
        # Count messages
        cursor.execute("SELECT COUNT(*) FROM ai_chat_history WHERE deleted_at IS NULL")
        count = cursor.fetchone()[0]
        print(f"   ✓ Total messages: {count}")
        
        # Show sample messages
        if count > 0:
            cursor.execute("""
                SELECT role, content, created_at 
                FROM ai_chat_history 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT 3
            """)
            messages = cursor.fetchall()
            print(f"\n   📝 SAMPLE MESSAGES:")
            for role, content, created_at in messages:
                print(f"      {role}: {content[:60]}...")
        
        # Show sessions
        cursor.execute("""
            SELECT 
                session_id,
                COUNT(*) as message_count,
                MAX(created_at) as last_activity
            FROM ai_chat_history
            WHERE deleted_at IS NULL
            GROUP BY session_id
            ORDER BY MAX(created_at) DESC
            LIMIT 5
        """)
        sessions = cursor.fetchall()
        if sessions:
            print(f"\n   📊 RECENT SESSIONS:")
            for session_id, msg_count, last_activity in sessions:
                print(f"      {str(session_id)[:8]}... : {msg_count} messages")
        
        cursor.close()
        
        print("\n" + "=" * 50)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        print(f"\n❌ DATABASE ERROR: {e}")
        raise
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
