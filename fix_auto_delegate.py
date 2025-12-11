#!/usr/bin/env python3
"""
FIX AUTO-DELEGATE: Create company record for CEO user
Issue: GET /companies?ceo_id=... returns 400 → No metrics → Auto-Delegate không trigger
"""

import os
import psycopg2
from datetime import datetime

# Database connection from .env
DATABASE_URL = "postgresql://postgres.dqddxowyikefqcdiioyh:Acookingoil123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"
CEO_USER_ID = "944f7536-6c9a-4bea-99fc-f1c984fef2ef"

def fix_company_record():
    """Create company record for CEO if not exists"""
    try:
        # Connect to database
        print("🔌 Connecting to Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check if CEO already has company
        print(f"🔍 Checking for existing company (owner_id={CEO_USER_ID[:8]}...)")
        cursor.execute("""
            SELECT id, name, owner_id 
            FROM companies 
            WHERE owner_id = %s
        """, (CEO_USER_ID,))
        
        existing = cursor.fetchone()
        
        if existing:
            print(f"✅ Company already exists: {existing[1]} (id={existing[0]})")
            print("✅ Auto-Delegate should work now!")
            return True
        
        # Create new company
        print("📝 Creating new company for CEO...")
        cursor.execute("""
            INSERT INTO companies (name, owner_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name
        """, (
            'SABO Tech Company',
            CEO_USER_ID,
            datetime.now(),
            datetime.now()
        ))
        
        new_company = cursor.fetchone()
        conn.commit()
        
        print(f"✅ Company created successfully!")
        print(f"   - ID: {new_company[0]}")
        print(f"   - Name: {new_company[1]}")
        print(f"   - CEO ID: {CEO_USER_ID}")
        
        # Verify
        cursor.execute("""
            SELECT 
                c.id as company_id,
                c.name,
                c.owner_id,
                u.email as ceo_email
            FROM companies c
            LEFT JOIN auth.users u ON u.id = c.owner_id
            WHERE c.owner_id = %s
        """, (CEO_USER_ID,))
        
        verify = cursor.fetchone()
        if verify:
            print("\n📊 VERIFICATION:")
            print(f"   - Company ID: {verify[0]}")
            print(f"   - Company Name: {verify[1]}")
            print(f"   - CEO Email: {verify[3] or 'N/A'}")
            print("\n🎉 Auto-Delegate is now ready to use!")
            print("   → Refresh browser and try: 'Giao 10 việc cấp bách cho manager'")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 FIX AUTO-DELEGATE - Create Company Record")
    print("=" * 60)
    print()
    
    success = fix_company_record()
    
    print()
    print("=" * 60)
    if success:
        print("✅ DONE! Auto-Delegate should work now!")
    else:
        print("❌ FAILED! Check errors above.")
    print("=" * 60)
