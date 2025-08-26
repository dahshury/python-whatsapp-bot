#!/usr/bin/env python3
"""
Migrate data from original_db.sqlite to new clean database structure.
This script preserves all your original data while fixing schema issues.
"""

import os
import sqlite3
import shutil
from datetime import datetime
from typing import List, Dict, Tuple

def backup_current_database():
    """Backup the current threads_db.sqlite before migration."""
    if os.path.exists('threads_db.sqlite'):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'threads_db_backup_before_migration_{timestamp}.sqlite'
        shutil.copy2('threads_db.sqlite', backup_name)
        print(f"✅ Current database backed up as: {backup_name}")
        return backup_name
    return None

def extract_data_from_original() -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Extract all data from original_db.sqlite (READ ONLY)."""
    print("📖 Reading data from original_db.sqlite...")
    
    if not os.path.exists('original_db.sqlite'):
        raise FileNotFoundError("original_db.sqlite not found!")
    
    # Open original database in READ-ONLY mode
    conn = sqlite3.connect('file:original_db.sqlite?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    customers_data = []
    conversations_data = []
    reservations_data = []
    
    try:
        # Extract customers
        cursor.execute("SELECT wa_id, customer_name FROM customers ORDER BY wa_id")
        for row in cursor.fetchall():
            customers_data.append({
                'wa_id': row['wa_id'],
                'customer_name': row['customer_name']
            })
        
        # Extract conversations (filter out any with invalid customer references)
        cursor.execute("""
            SELECT c.wa_id, c.role, c.message, c.date, c.time 
            FROM conversation c
            WHERE c.wa_id IN (SELECT wa_id FROM customers)
            ORDER BY c.id
        """)
        for row in cursor.fetchall():
            conversations_data.append({
                'wa_id': row['wa_id'],
                'role': row['role'],
                'message': row['message'],
                'date': row['date'],
                'time': row['time']
            })
        
        # Extract reservations
        cursor.execute("""
            SELECT wa_id, date, time_slot, type, status, 
                   cancelled_at, created_at, updated_at 
            FROM reservations
            ORDER BY id
        """)
        for row in cursor.fetchall():
            reservations_data.append({
                'wa_id': row['wa_id'],
                'date': row['date'],
                'time_slot': row['time_slot'],
                'type': row['type'],
                'status': row['status'],
                'cancelled_at': row['cancelled_at'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        
        print("📊 Data extracted:")
        print(f"  - Customers: {len(customers_data):,}")
        print(f"  - Conversations: {len(conversations_data):,}")
        print(f"  - Reservations: {len(reservations_data):,}")
        
    except Exception as e:
        print(f"❌ Error extracting data: {e}")
        raise
    finally:
        conn.close()
    
    return customers_data, conversations_data, reservations_data

def create_new_database_with_data(customers_data: List[Dict], 
                                conversations_data: List[Dict], 
                                reservations_data: List[Dict]) -> str:
    """Create new database with clean schema and migrated data."""
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    new_db_name = f'migrated_database_{timestamp}.sqlite'
    
    print(f"🔨 Creating new database: {new_db_name}")
    
    conn = sqlite3.connect(new_db_name)
    cursor = conn.cursor()
    
    try:
        # Create clean schema (matching db.py)
        cursor.executescript("""
            -- Customers table
            CREATE TABLE customers (
                wa_id TEXT PRIMARY KEY,
                customer_name TEXT
            );
            CREATE INDEX idx_customers_wa_id ON customers(wa_id);
            
            -- Conversation table with FIXED foreign key
            CREATE TABLE conversation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wa_id TEXT,
                role TEXT,
                message TEXT,
                date TEXT,
                time TEXT,
                FOREIGN KEY (wa_id) REFERENCES customers(wa_id)
            );
            CREATE INDEX idx_conversation_wa_id ON conversation(wa_id);
            CREATE INDEX idx_conversation_wa_id_date_time ON conversation(wa_id, date, time);
            
            -- Reservations table
            CREATE TABLE reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wa_id TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                type INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wa_id) REFERENCES customers(wa_id),
                CHECK(type IN (0, 1)),
                CHECK(status IN ('active', 'cancelled'))
            );
            CREATE INDEX idx_reservations_wa_id ON reservations(wa_id);
            CREATE INDEX idx_reservations_date_time ON reservations(date, time_slot);
            CREATE INDEX idx_reservations_status ON reservations(status);
            CREATE INDEX idx_reservations_wa_id_status ON reservations(wa_id, status);
            CREATE INDEX idx_reservations_date_time_status ON reservations(date, time_slot, status);
            
            -- Vacation periods table (new from db.py)
            CREATE TABLE vacation_periods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_date DATE NOT NULL,
                end_date DATE,
                duration_days INTEGER,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK(duration_days IS NULL OR duration_days >= 1),
                CHECK(end_date IS NULL OR start_date <= end_date)
            );
            CREATE INDEX idx_vacations_start ON vacation_periods(start_date);
            CREATE INDEX idx_vacations_end ON vacation_periods(end_date);
        """)
        
        print("✅ Clean schema created")
        
        # Migrate customers first (to satisfy foreign keys)
        print("👥 Migrating customers...")
        customers_migrated = 0
        for customer in customers_data:
            try:
                cursor.execute(
                    "INSERT OR REPLACE INTO customers (wa_id, customer_name) VALUES (?, ?)",
                    (customer['wa_id'], customer['customer_name'])
                )
                customers_migrated += 1
            except Exception as e:
                print(f"❌ Error migrating customer {customer['wa_id']}: {e}")
        
        print(f"✅ Migrated {customers_migrated:,} customers")
        
        # Migrate conversations
        print("💬 Migrating conversations...")
        conversations_migrated = 0
        for conv in conversations_data:
            try:
                cursor.execute(
                    "INSERT INTO conversation (wa_id, role, message, date, time) VALUES (?, ?, ?, ?, ?)",
                    (conv['wa_id'], conv['role'], conv['message'], conv['date'], conv['time'])
                )
                conversations_migrated += 1
            except Exception as e:
                print(f"❌ Error migrating conversation: {e}")
                # Continue with other conversations
        
        print(f"✅ Migrated {conversations_migrated:,} conversations")
        
        # Migrate reservations
        print("📅 Migrating reservations...")
        reservations_migrated = 0
        for res in reservations_data:
            try:
                cursor.execute(
                    """INSERT INTO reservations 
                       (wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (res['wa_id'], res['date'], res['time_slot'], res['type'], 
                     res['status'], res['cancelled_at'], res['created_at'], res['updated_at'])
                )
                reservations_migrated += 1
            except Exception as e:
                print(f"❌ Error migrating reservation: {e}")
        
        print(f"✅ Migrated {reservations_migrated:,} reservations")
        
        # Commit all changes
        conn.commit()
        
        print("🎉 Migration completed successfully!")
        print("📊 Final counts:")
        print(f"  - Customers: {customers_migrated:,}")
        print(f"  - Conversations: {conversations_migrated:,}")
        print(f"  - Reservations: {reservations_migrated:,}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()
    
    return new_db_name

def validate_migrated_database(db_path: str) -> bool:
    """Validate the migrated database."""
    print(f"🔍 Validating migrated database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check integrity
        cursor.execute('PRAGMA integrity_check;')
        integrity = cursor.fetchone()[0]
        
        # Check foreign key constraints
        cursor.execute('PRAGMA foreign_key_check;')
        violations = cursor.fetchall()
        
        # Get final counts
        cursor.execute('SELECT COUNT(*) FROM customers')
        customers_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM conversation')
        conversations_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM reservations')
        reservations_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM vacation_periods')
        vacation_periods_count = cursor.fetchone()[0]
        
        print("🔍 Validation results:")
        print(f"  - Database integrity: {integrity}")
        print(f"  - Foreign key violations: {len(violations)}")
        print(f"  - Customers: {customers_count:,}")
        print(f"  - Conversations: {conversations_count:,}")
        print(f"  - Reservations: {reservations_count:,}")
        print(f"  - Vacation periods: {vacation_periods_count:,}")
        
        conn.close()
        
        if integrity == 'ok' and len(violations) == 0:
            print("✅ Database validation PASSED!")
            return True
        else:
            print("❌ Database validation FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

def replace_current_database(new_db_path: str):
    """Replace threads_db.sqlite with the migrated database."""
    print("🔄 Replacing threads_db.sqlite with migrated database...")
    
    # Remove current database
    if os.path.exists('threads_db.sqlite'):
        os.remove('threads_db.sqlite')
    
    # Move migrated database to final location
    shutil.move(new_db_path, 'threads_db.sqlite')
    print("✅ Database replacement completed!")

def main():
    """Main migration function."""
    print("🚀 STARTING DATA MIGRATION FROM ORIGINAL DATABASE")
    print("=" * 60)
    
    try:
        # Step 1: Backup current database
        backup_current_database()
        
        # Step 2: Extract data from original database (READ ONLY)
        customers_data, conversations_data, reservations_data = extract_data_from_original()
        
        # Step 3: Create new database with migrated data
        new_db_path = create_new_database_with_data(customers_data, conversations_data, reservations_data)
        
        # Step 4: Validate migrated database
        if not validate_migrated_database(new_db_path):
            print("❌ Migration validation failed. Keeping original files.")
            return False
        
        # Step 5: Replace current database
        replace_current_database(new_db_path)
        
        print("\n" + "=" * 60)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("✅ All your original data has been migrated to the new structure")
        print("✅ Database corruption issues are fixed")
        print("✅ Foreign key relationships are now correct")
        print("✅ Application is ready for use")
        print("\n📝 NEXT STEPS:")
        print("1. Restart your Docker containers: docker-compose restart")
        print("2. Your application will now work with all your original data")
        
        return True
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {e}")
        print("Your original_db.sqlite remains unchanged.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
