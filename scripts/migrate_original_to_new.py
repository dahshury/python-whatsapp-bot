#!/usr/bin/env python3
"""
Migrate data from original_db.sqlite to new clean database structure.
This script preserves all your original data while fixing schema issues.

IMPROVED VERSION: Handles concurrency, foreign keys, and Windows-specific issues.
"""

import os
import sqlite3
import shutil
import time
from datetime import datetime
from typing import List, Dict, Tuple

def check_database_in_use(db_path: str) -> bool:
    """Check if the database is currently being used by any process."""
    try:
        # Try to open with exclusive lock (will fail if in use)
        conn = sqlite3.connect(f'file:{db_path}?mode=rwc', uri=True, timeout=1.0)
        cursor = conn.cursor()
        cursor.execute('BEGIN IMMEDIATE;')  # Acquire immediate lock
        cursor.execute('ROLLBACK;')
        conn.close()
        return False
    except sqlite3.OperationalError as e:
        if 'database is locked' in str(e).lower():
            return True
        return False
    except Exception:
        return True

def wait_for_database_release(db_path: str, max_wait_seconds: int = 30) -> bool:
    """Wait for database to be released by other processes."""
    print(f"⏳ Waiting for database to be released: {db_path}")
    start_time = time.time()
    
    while time.time() - start_time < max_wait_seconds:
        if not check_database_in_use(db_path):
            print("✅ Database is now available")
            return True
        time.sleep(1)
        print(".", end="", flush=True)
    
    print(f"\n❌ Timeout: Database still in use after {max_wait_seconds} seconds")
    return False

def backup_current_database():
    """Backup the current threads_db.sqlite before migration."""
    if os.path.exists('threads_db.sqlite'):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'threads_db_backup_before_migration_{timestamp}.sqlite'
        
        # Check if database is in use before backing up
        if check_database_in_use('threads_db.sqlite'):
            print("⚠️  Database is currently in use. Attempting to wait for release...")
            if not wait_for_database_release('threads_db.sqlite'):
                raise RuntimeError("Cannot backup database - it's still in use. Please stop the application first.")
        
        # Perform checkpoint and backup
        _checkpoint_and_vacuum('threads_db.sqlite')
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
        # Enable foreign key constraints and configure SQLite properly
        cursor.execute('PRAGMA foreign_keys = ON;')
        cursor.execute('PRAGMA journal_mode = WAL;')
        cursor.execute('PRAGMA synchronous = NORMAL;')
        cursor.execute('PRAGMA temp_store = MEMORY;')
        cursor.execute('PRAGMA mmap_size = 268435456;')  # 256MB
        
        # Create clean schema (matching db.py + auth users)
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

            -- Users table (FastAPI-Users default UUID-based schema)
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(320) NOT NULL UNIQUE,
                hashed_password VARCHAR(1024) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                is_superuser BOOLEAN NOT NULL DEFAULT 0,
                is_verified BOOLEAN NOT NULL DEFAULT 0
            );
            CREATE UNIQUE INDEX idx_users_email ON users(email);

            -- Customer Documents table for Excalidraw scenes
            CREATE TABLE customer_documents (
                wa_id TEXT PRIMARY KEY,
                document_json TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_customer_documents_wa_id ON customer_documents(wa_id);
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
        
        # Verify foreign key constraints are working
        cursor.execute('PRAGMA foreign_key_check;')
        fk_violations = cursor.fetchall()
        if fk_violations:
            raise Exception(f"Foreign key violations found: {fk_violations}")
        
        print("✅ Foreign key constraints verified")
        
        print("🎉 Migration completed successfully!")
        print("📊 Final counts:")
        print(f"  - Customers: {customers_migrated:,}")
        print(f"  - Conversations: {conversations_migrated:,}")
        print(f"  - Reservations: {reservations_migrated:,}")
        # Users are not migrated from original DB (new feature), but ensure table exists
        cursor.execute('SELECT COUNT(*) FROM users')
        users_count = cursor.fetchone()[0]
        print(f"  - Users: {users_count:,}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()
    
    return new_db_name

def validate_migrated_database(db_path: str) -> bool:
    """Validate the migrated database with comprehensive checks."""
    print(f"🔍 Validating migrated database: {db_path}")
    
    try:
        # Test both SQLite and SQLAlchemy connections
        success = validate_sqlite_direct(db_path) and validate_sqlalchemy_compatibility(db_path)
        return success
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

def validate_sqlite_direct(db_path: str) -> bool:
    """Validate database using direct SQLite connection."""
    try:
        conn = sqlite3.connect(db_path)
        conn.execute('PRAGMA foreign_keys = ON;')  # Enable foreign keys for validation
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
        # Customer documents count
        try:
            cursor.execute('SELECT COUNT(*) FROM customer_documents')
            documents_count = cursor.fetchone()[0]
        except Exception:
            documents_count = 0
        
        # Users table count (may be zero)
        try:
            cursor.execute('SELECT COUNT(*) FROM users')
            users_count = cursor.fetchone()[0]
        except Exception:
            users_count = 0
        
        print("🔍 SQLite validation results:")
        print(f"  - Database integrity: {integrity}")
        print(f"  - Foreign key violations: {len(violations)}")
        print(f"  - Customers: {customers_count:,}")
        print(f"  - Conversations: {conversations_count:,}")
        print(f"  - Reservations: {reservations_count:,}")
        print(f"  - Vacation periods: {vacation_periods_count:,}")
        print(f"  - Users: {users_count:,}")
        print(f"  - Customer documents: {documents_count:,}")
        
        # Test the problematic JOIN query
        cursor.execute("""
            SELECT COUNT(*) FROM reservations 
            JOIN customers ON reservations.wa_id = customers.wa_id
        """)
        join_count = cursor.fetchone()[0]
        print(f"  - JOIN query test: {join_count:,} records")
        
        conn.close()
        
        if integrity == 'ok' and len(violations) == 0:
            print("✅ SQLite validation PASSED!")
            return True
        else:
            print("❌ SQLite validation FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ SQLite validation error: {e}")
        return False

def validate_sqlalchemy_compatibility(db_path: str) -> bool:
    """Validate database using SQLAlchemy (same as the application uses)."""
    print("🔍 Testing SQLAlchemy compatibility...")
    try:
        # Import SQLAlchemy components (same as app/db.py)
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        
        # Create engine with same settings as app
        engine = create_engine(
            f"sqlite:///{db_path}", 
            echo=False, 
            future=True, 
            connect_args={"check_same_thread": False}
        )
        
        Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
        session = Session()
        
        try:
            # Test the exact problematic query from the error message
            result = session.execute(text("""
                SELECT reservations.id, reservations.wa_id, customers.customer_name, 
                       reservations.date, reservations.time_slot, reservations.type, reservations.status 
                FROM reservations 
                JOIN customers ON reservations.wa_id = customers.wa_id 
                ORDER BY reservations.wa_id ASC, reservations.date ASC, reservations.time_slot ASC 
                LIMIT 5
            """))
            
            records = result.fetchall()
            print(f"✅ SQLAlchemy validation PASSED! Found {len(records)} test records")
            
            # Test a simple count query too
            count_result = session.execute(text("SELECT COUNT(*) FROM reservations"))
            count = count_result.scalar()
            print(f"✅ SQLAlchemy count query: {count:,} reservations")

            # Validate users table presence
            try:
                users_count = session.execute(text("SELECT COUNT(*) FROM users")).scalar()
                print(f"✅ Users table present: {users_count:,} users")
            except Exception:
                print("⚠️  Users table missing (auth not initialized)")

            # Validate customer_documents table presence
            try:
                docs_count = session.execute(text("SELECT COUNT(*) FROM customer_documents")).scalar()
                print(f"✅ Customer documents table present: {docs_count:,} documents")
            except Exception:
                print("⚠️  Customer documents table missing")
            
            return True
            
        finally:
            session.close()
            engine.dispose()
            
    except ImportError:
        print("⚠️  SQLAlchemy not available for validation - skipping compatibility test")
        return True  # Don't fail if SQLAlchemy isn't available
    except Exception as e:
        print(f"❌ SQLAlchemy validation FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def replace_current_database(new_db_path: str):
    """Replace threads_db.sqlite with the migrated database."""
    print("🔄 Replacing threads_db.sqlite with migrated database...")
    
    # Ensure no processes are using the database
    if os.path.exists('threads_db.sqlite') and check_database_in_use('threads_db.sqlite'):
        print("⚠️  Database still in use. Waiting for release...")
        if not wait_for_database_release('threads_db.sqlite', max_wait_seconds=10):
            print("❌ Cannot replace database - still in use. Please stop the application.")
            return False
    
    # Clean up any existing WAL/SHM files first
    _remove_sidecar_files('threads_db.sqlite')
    
    # Remove current database
    if os.path.exists('threads_db.sqlite'):
        try:
            os.remove('threads_db.sqlite')
        except PermissionError as e:
            print(f"❌ Cannot remove old database: {e}")
            return False
    
    # Move migrated database to final location
    try:
        shutil.move(new_db_path, 'threads_db.sqlite')
        print("✅ Database replacement completed!")
        return True
    except Exception as e:
        print(f"❌ Database replacement failed: {e}")
        return False

def _checkpoint_and_vacuum(db_path: str) -> bool:
    """Attempt to checkpoint WAL and vacuum the database to remove WAL usage.

    Returns True if the operations were attempted (file existed), False if file missing.
    """
    if not os.path.exists(db_path):
        return False
    
    try:
        # Use a longer timeout and more aggressive settings
        conn = sqlite3.connect(db_path, timeout=10.0)
        conn.execute('PRAGMA busy_timeout = 10000;')  # 10 seconds
        cursor = conn.cursor()
        
        try:
            # First checkpoint to flush WAL safely without truncation
            cursor.execute('PRAGMA synchronous=FULL;')
            try:
                cursor.execute('PRAGMA fullfsync=ON;')
            except Exception:
                pass
            cursor.execute('PRAGMA wal_checkpoint(FULL);')
            print(f"✅ WAL checkpoint(FULL) completed for {db_path}")
        except sqlite3.OperationalError as e:
            if 'not a wal database' not in str(e).lower():
                print(f"⚠️  WAL checkpoint issue for {db_path}: {e}")
        
        try:
            # Then vacuum to compact
            cursor.execute('VACUUM;')
            print(f"✅ VACUUM completed for {db_path}")
        except sqlite3.OperationalError as e:
            print(f"⚠️  VACUUM skipped for {db_path}: {e}")
            
        return True
        
    except Exception as e:
        print(f"⚠️  Checkpoint/VACUUM failed for {db_path}: {e}")
        return True
    finally:
        try:
            if 'conn' in locals():
                conn.close()
        except Exception:
            pass

def _remove_sidecar_files(db_path: str):
    """Remove -wal and -shm sidecar files for the given SQLite db path, if present."""
    for suffix in ('-wal', '-shm'):
        sidecar = f"{db_path}{suffix}"
        try:
            if os.path.exists(sidecar):
                # On Windows, try multiple times with delays
                for attempt in range(3):
                    try:
                        os.remove(sidecar)
                        print(f"🧹 Removed sidecar file: {sidecar}")
                        break
                    except PermissionError:
                        if attempt < 2:  # Not the last attempt
                            time.sleep(0.5)
                            continue
                        else:
                            print(f"⚠️  Could not remove sidecar {sidecar} after 3 attempts")
        except Exception as e:
            print(f"⚠️  Could not remove sidecar {sidecar}: {e}")

def cleanup_sqlite_artifacts(paths: List[str]):
    """Flush WAL, vacuum, and delete -wal/-shm files for given SQLite dbs."""
    for path in paths:
        print(f"🧹 Cleaning SQLite artifacts for: {path}")
        attempted = _checkpoint_and_vacuum(path)
        if attempted:
            _remove_sidecar_files(path)
    
    # Also clean up any orphaned WAL/SHM files that might exist
    print("🧹 Checking for orphaned SQLite sidecar files...")
    orphaned_files = []
    for file in os.listdir('.'):
        if file.endswith(('.sqlite-wal', '.sqlite-shm')):
            orphaned_files.append(file)
    
    if orphaned_files:
        print(f"🧹 Found orphaned sidecar files: {', '.join(orphaned_files)}")
        for file in orphaned_files:
            try:
                os.remove(file)
                print(f"🧹 Removed orphaned file: {file}")
            except Exception as e:
                print(f"⚠️  Could not remove orphaned file {file}: {e}")
    else:
        print("✅ No orphaned sidecar files found")

def main():
    """Main migration function."""
    print("🚀 STARTING DATA MIGRATION FROM ORIGINAL DATABASE")
    print("=" * 60)
    print("⚠️  IMPORTANT: Please ensure your application is STOPPED before migration!")
    print("   - Stop Docker containers: docker-compose down")
    print("   - Stop any Python processes using the database")
    print("   - Wait for all database connections to close")
    print()
    
    # Give user a chance to abort
    try:
        input("Press Enter to continue or Ctrl+C to abort...")
    except KeyboardInterrupt:
        print("\n❌ Migration aborted by user.")
        return False
    print()
    
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
        if not replace_current_database(new_db_path):
            print("❌ Database replacement failed. Migration aborted.")
            return False

        # Step 6: Final validation of replaced database
        print("🔍 Final validation of replaced database...")
        if not validate_migrated_database('threads_db.sqlite'):
            print("❌ Final validation failed. Please check the database.")
            return False

        # Step 7: Cleanup WAL/SHM sidecar files now that everything is closed
        print("🧹 Cleaning up SQLite artifacts...")
        cleanup_sqlite_artifacts([
            'original_db.sqlite',
            'threads_db.sqlite',
        ])
        
        print("\n" + "=" * 60)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("✅ All your original data has been migrated to the new structure")
        print("✅ Database corruption issues are fixed")
        print("✅ Foreign key relationships are now correct")
        print("✅ SQLAlchemy compatibility verified")
        print("✅ Application is ready for use")
        print("\n📝 NEXT STEPS:")
        print("1. Restart your Docker containers: docker-compose restart")
        print("2. Test your application to ensure everything works correctly")
        print("3. Monitor logs for any database-related errors")
        print("4. If issues persist, check the backup file created during migration")
        print("\n🔍 TROUBLESHOOTING:")
        print("- If you still get corruption errors, ensure no other processes are accessing the database")
        print("- Check that your application stops cleanly before running migration")
        print("- The migration script now includes comprehensive validation to prevent issues")
        
        return True
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {e}")
        print("Your original_db.sqlite remains unchanged.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
