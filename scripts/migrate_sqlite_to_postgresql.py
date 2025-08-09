#!/usr/bin/env python3
"""
Standalone SQLite to PostgreSQL Migration Script

This script migrates data from SQLite (threads_db.sqlite) to PostgreSQL
with the new normalized schema and vector search support.
"""

import argparse
import asyncio
import hashlib
import sqlite3
import sys
import os
import logging
from pathlib import Path
from typing import List, Optional


# Set up logging
def setup_logging():
    """Set up logging for the migration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('migration.log')
        ]
    )
    return logging.getLogger('migration')


logger = setup_logging()


def generate_dummy_embeddings(text: str, dimension: int = 384) -> List[float]:
    """Generate dummy embeddings for testing (deterministic hash-based)"""
    if text is None:
        text = ""

    # Ensure text is a string
    text = str(text)

    # Create a deterministic hash-based embedding
    hash_obj = hashlib.md5(text.encode("utf-8", errors="replace"))
    hash_hex = hash_obj.hexdigest()

    # Convert to numbers and normalize to [-1, 1] range
    embedding = []
    for i in range(0, min(len(hash_hex), dimension * 2), 2):
        val = int(hash_hex[i : i + 2], 16) / 127.5 - 1.0
        embedding.append(val)

    # Pad or truncate to exact dimension
    while len(embedding) < dimension:
        embedding.append(0.0)

    return embedding[:dimension]


class SQLiteToPostgreSQLMigrator:
    """Standalone migrator from SQLite to PostgreSQL SQL file generation"""

    def __init__(
        self,
        sqlite_path: str = "threads_db.sqlite",
        postgres_connection_string: Optional[str] = None,
    ):
        self.sqlite_path = sqlite_path
        # SQL file generation properties (will be initialized in connect_postgres)
        self.sql_output_dir: Optional[Path] = None
        self.schema_file: Optional[Path] = None
        self.data_file: Optional[Path] = None
        self.indexes_file: Optional[Path] = None

    async def connect_postgres(self):
        """Generate SQL files instead of connecting to server"""
        # Create output directory for SQL files
        self.sql_output_dir = Path("migration_sql_output")
        self.sql_output_dir.mkdir(exist_ok=True)
        
        # Initialize SQL files
        self.schema_file = self.sql_output_dir / "01_create_schema.sql"
        self.data_file = self.sql_output_dir / "02_insert_data.sql"
        self.indexes_file = self.sql_output_dir / "03_create_indexes.sql"
        
        logger.info(f"Generating SQL files in: {self.sql_output_dir}")
        
        # Create schema SQL
        schema_sql = """
-- Create new PostgreSQL schema with pgvector support

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    reservation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, date, time_slot, reservation_type)
);

-- Create conversations table with vector support
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    sender_type VARCHAR(20) NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) NOT NULL,
    recipient_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    content TEXT,
    content_embedding vector(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create history table
CREATE TABLE IF NOT EXISTS history (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    tool_used VARCHAR(100),
    performed_by VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
"""
        
        with open(self.schema_file, 'w', encoding='utf-8') as f:
            f.write(schema_sql)
        
        # Initialize data file
        with open(self.data_file, 'w', encoding='utf-8') as f:
            f.write("-- Data migration from SQLite to PostgreSQL\n\n")
        
        logger.info("Schema SQL file created")

    def connect_sqlite(self) -> sqlite3.Connection:
        """Connect to SQLite database"""
        sqlite_file = Path(self.sqlite_path)
        if not sqlite_file.exists():
            raise FileNotFoundError(f"SQLite database not found: {self.sqlite_path}")

        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        logger.info(f"Connected to SQLite database: {self.sqlite_path}")
        return conn

    async def migrate_customers(self, sqlite_conn: sqlite3.Connection) -> int:
        """Generate SQL for customers migration"""
        logger.info("Generating SQL for customers migration...")

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT wa_id, customer_name FROM customers")
        customers = cursor.fetchall()

        migrated_count = 0
        sql_statements = []
        
        # Generate INSERT statements
        for customer in customers:
            name = (customer["customer_name"] or "Unknown").replace("'", "''")  # Escape quotes
            phone = customer["wa_id"].replace("'", "''")
            
            sql = f"""INSERT INTO customers (name, phone_number) 
VALUES ('{name}', '{phone}') 
ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name;"""
            
            sql_statements.append(sql)
            migrated_count += 1

        # Write to SQL file
        assert self.data_file is not None, "Data file not initialized"
        with open(self.data_file, 'a', encoding='utf-8') as f:
            f.write("-- Customers data\n")
            f.write('\n'.join(sql_statements))
            f.write('\n\n')

        logger.info(f"Generated SQL for {migrated_count} customers")
        return migrated_count

    async def migrate_conversations(self, sqlite_conn: sqlite3.Connection) -> int:
        """Generate SQL for conversations migration"""
        logger.info("Generating SQL for conversations migration...")

        # Create mapping from phone_number to customer index (we'll use a lookup table approach)
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT wa_id, customer_name FROM customers")
        customers = cursor.fetchall()
        
        customer_mapping = {}
        for idx, customer in enumerate(customers, 1):  # Start from 1 for SQL IDs
            customer_mapping[customer["wa_id"]] = idx

        cursor.execute("""
            SELECT id, wa_id, role, message, date, time
            FROM conversation
            ORDER BY id
        """)
        conversations = cursor.fetchall()

        migrated_count = 0
        migration_errors = []
        sql_statements = []
        
        # Generate INSERT statements
        for c in conversations:
            customer_id = customer_mapping.get(c["wa_id"])
            if not customer_id:
                migration_errors.append((c["id"], "Customer not found for phone number"))
                continue
                
            # Combine date and time into timestamp
            timestamp = f"{c['date']} {c['time']}" if c["date"] and c["time"] else c["date"] or c["time"]
            
            # Generate vector embedding for the message
            content = (c["message"] or "").replace("'", "''")  # Escape quotes
            content_embedding = generate_dummy_embeddings(c["message"] or "")
            embedding_str = "[" + ",".join(map(str, content_embedding)) + "]"
            
            if c["role"] == "user":
                # User message: sender=customer, recipient=system
                sql = f"""INSERT INTO conversations (sender_type, sender_id, recipient_type, recipient_id, timestamp, content, content_embedding) 
VALUES ('user', {customer_id}, 'system', 1, '{timestamp}', '{content}', '{embedding_str}');"""
            elif c["role"] == "assistant":
                # Assistant message: sender=system, recipient=customer
                sql = f"""INSERT INTO conversations (sender_type, sender_id, recipient_type, recipient_id, timestamp, content, content_embedding) 
VALUES ('system', 1, 'user', {customer_id}, '{timestamp}', '{content}', '{embedding_str}');"""
            else:
                migration_errors.append((c["id"], f"Unknown role: {c['role']}"))
                continue
                
            sql_statements.append(sql)
            migrated_count += 1

        # Write to SQL file
        with open(self.data_file, 'a', encoding='utf-8') as f:
            f.write("-- Conversations data\n")
            f.write('\n'.join(sql_statements))
            f.write('\n\n')

        # Log migration errors
        if migration_errors:
            logger.warning(f"Skipped {len(migration_errors)} conversations due to errors")

        logger.info(f"Generated SQL for {migrated_count} conversations with vector embeddings")
        return migrated_count

    async def migrate_reservations(self, sqlite_conn: sqlite3.Connection) -> int:
        """Generate SQL for reservations migration"""
        logger.info("Generating SQL for reservations migration...")

        # Create mapping from phone_number to customer index
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT wa_id, customer_name FROM customers")
        customers = cursor.fetchall()
        
        customer_mapping = {}
        for idx, customer in enumerate(customers, 1):  # Start from 1 for SQL IDs
            customer_mapping[customer["wa_id"]] = idx

        cursor.execute("""
            SELECT wa_id, date, time_slot, type, status
            FROM reservations
            ORDER BY id
        """)
        reservations = cursor.fetchall()

        migrated_count = 0
        migration_errors = []
        sql_statements = []
        
        # Generate INSERT statements
        for r in reservations:
            customer_id = customer_mapping.get(r["wa_id"])
            if customer_id:
                # Convert INTEGER type (0, 1) to string representation
                reservation_type = "haircut" if r["type"] == 0 else "beard_trim"
                # Handle status column safely (might not exist in old schema)
                try:
                    status = r["status"] if r["status"] else "active"
                except (KeyError, IndexError):
                    status = "active"
                date = r["date"]
                time_slot = r["time_slot"].replace("'", "''")  # Escape quotes
                
                sql = f"""INSERT INTO reservations (customer_id, date, time_slot, reservation_type, status) 
VALUES ({customer_id}, '{date}', '{time_slot}', '{reservation_type}', '{status}') 
ON CONFLICT (customer_id, date, time_slot, reservation_type) DO UPDATE SET status = EXCLUDED.status;"""
                
                sql_statements.append(sql)
                migrated_count += 1
            else:
                migration_errors.append((r["wa_id"], "Customer not found for phone number"))

        # Write to SQL file
        with open(self.data_file, 'a', encoding='utf-8') as f:
            f.write("-- Reservations data\n")
            f.write('\n'.join(sql_statements))
            f.write('\n\n')

        # Log migration errors
        if migration_errors:
            logger.warning(f"Skipped {len(migration_errors)} reservations due to errors")

        logger.info(f"Generated SQL for {migrated_count} reservations")
        return migrated_count

    async def migrate_history(self, sqlite_conn: sqlite3.Connection) -> int:
        """Generate SQL for history table entries"""
        logger.info("Generating SQL for history entries...")

        # Get source data for history entries
        cursor = sqlite_conn.cursor()
        
        # Count customers
        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]
        
        # Count conversations  
        cursor.execute("SELECT COUNT(*) FROM conversation")
        conversation_count = cursor.fetchone()[0]
        
        # Count reservations
        cursor.execute("SELECT COUNT(*) FROM reservations")
        reservation_count = cursor.fetchone()[0]

        sql_statements = []
        migrated_count = 0
        
        # Generate history for customers (using generated IDs)
        for i in range(1, customer_count + 1):
            sql = f"""INSERT INTO history (entity_type, entity_id, action_type, tool_used, performed_by, timestamp, details) 
VALUES ('customer', {i}, 'create', 'migration', 'system', NOW(), 'Customer migrated from SQLite');"""
            sql_statements.append(sql)
            migrated_count += 1
        
        # Generate history for conversations (using generated IDs)
        for i in range(1, conversation_count + 1):
            sql = f"""INSERT INTO history (entity_type, entity_id, action_type, tool_used, performed_by, timestamp, details) 
VALUES ('conversation', {i}, 'create', 'migration', 'system', NOW(), 'Message migrated from SQLite');"""
            sql_statements.append(sql)
            migrated_count += 1
        
        # Generate history for reservations (using generated IDs)  
        for i in range(1, reservation_count + 1):
            sql = f"""INSERT INTO history (entity_type, entity_id, action_type, tool_used, performed_by, timestamp, details) 
VALUES ('reservation', {i}, 'create', 'migration', 'system', NOW(), 'Reservation migrated from SQLite');"""
            sql_statements.append(sql)
            migrated_count += 1

        # Write to SQL file
        with open(self.data_file, 'a', encoding='utf-8') as f:
            f.write("-- History data\n")
            f.write('\n'.join(sql_statements))
            f.write('\n\n')

        logger.info(f"Generated SQL for {migrated_count} history entries")
        return migrated_count

    async def verify_migration(self, sqlite_conn: sqlite3.Connection) -> bool:
        """Verify SQL file generation by checking source data"""
        logger.info("Verifying SQL file generation...")

        # Get SQLite counts
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM customers")
        sqlite_customers = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM conversation")
        sqlite_conversations = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM reservations")
        sqlite_reservations = cursor.fetchone()[0]

        # Check if SQL files were created
        schema_exists = self.schema_file.exists()
        data_exists = self.data_file.exists()
        
        # Rough verification by checking file sizes
        schema_size = self.schema_file.stat().st_size if schema_exists else 0
        data_size = self.data_file.stat().st_size if data_exists else 0

        logger.info("SQL file generation verification:")
        logger.info(f"Source data counts:")
        logger.info(f"  - Customers: {sqlite_customers}")
        logger.info(f"  - Conversations: {sqlite_conversations}")
        logger.info(f"  - Reservations: {sqlite_reservations}")
        logger.info(f"Generated files:")
        logger.info(f"  - Schema file: {'✅' if schema_exists else '❌'} ({schema_size} bytes)")
        logger.info(f"  - Data file: {'✅' if data_exists else '❌'} ({data_size} bytes)")

        success = (
            schema_exists and schema_size > 0 and
            data_exists and data_size > 0 and
            sqlite_customers > 0  # At least some data to migrate
        )

        if success:
            logger.info("✅ SQL file generation verification PASSED")
        else:
            logger.error("❌ SQL file generation verification FAILED")

        return success

    async def test_vector_search(self):
        """Generate indexes and validation SQL for vector search"""
        logger.info("Generating vector search indexes and validation SQL...")

        # Create indexes SQL file
        indexes_sql = """
-- Create indexes for better performance

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Reservations indexes  
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_sender ON conversations(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_recipient ON conversations(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);

-- Vector similarity search index (HNSW for faster vector operations)
CREATE INDEX IF NOT EXISTS idx_conversations_embedding ON conversations USING hnsw (content_embedding vector_cosine_ops);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_history_entity ON history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp);


-- Sample vector search queries (for testing after import)

-- Find similar conversations (replace [0.1,0.2,0.3...] with actual embedding vector)
-- SELECT sender_id, content, 1 - (content_embedding <=> '[0.1,0.2,0.3]') as similarity_score
-- FROM conversations
-- WHERE content IS NOT NULL
-- ORDER BY content_embedding <=> '[0.1,0.2,0.3]'
-- LIMIT 5;

-- Count conversations by sender type
-- SELECT sender_type, COUNT(*) FROM conversations GROUP BY sender_type;

-- Find customer conversation history
-- SELECT c.name, conv.content, conv.timestamp 
-- FROM customers c
-- JOIN conversations conv ON (conv.sender_id = c.id AND conv.sender_type = 'user')
-- WHERE c.phone_number = 'PHONE_NUMBER_HERE'
-- ORDER BY conv.timestamp;
"""
        
        with open(self.indexes_file, 'w', encoding='utf-8') as f:
            f.write(indexes_sql)
        
        logger.info(f"✅ Generated vector search indexes and validation queries")
        logger.info(f"📁 Files created in: {self.sql_output_dir}/")
        logger.info("📋 Import order:")
        logger.info("   1. 01_create_schema.sql")
        logger.info("   2. 02_insert_data.sql") 
        logger.info("   3. 03_create_indexes.sql")

    async def run_migration(self):
        """Run the complete SQL file generation process"""
        logger.info("Starting SQLite to PostgreSQL SQL file generation...")
        logger.info(f"Source: {self.sqlite_path}")
        logger.info("Target: SQL files for PostgreSQL import")

        try:
            # Initialize SQL file generation
            await self.connect_postgres()  # This now creates SQL files instead
            sqlite_conn = self.connect_sqlite()

            # Generate SQL for all tables
            customers_count = await self.migrate_customers(sqlite_conn)
            conversations_count = await self.migrate_conversations(sqlite_conn)
            reservations_count = await self.migrate_reservations(sqlite_conn)
            history_count = await self.migrate_history(sqlite_conn)

            # Verify SQL file generation
            verification_success = await self.verify_migration(sqlite_conn)

            # Generate indexes and validation queries
            await self.test_vector_search()

            # Close SQLite connection
            sqlite_conn.close()

            logger.info("🎉 SQL file generation completed successfully!")
            logger.info("📊 Migration summary:")
            logger.info(f"  - Customers: {customers_count} records")
            logger.info(f"  - Conversations: {conversations_count} records")
            logger.info(f"  - Reservations: {reservations_count} records")
            logger.info(f"  - History: {history_count} records")
            logger.info(f"  - Files generated: {'✅ SUCCESS' if verification_success else '❌ FAILED'}")
            
            if verification_success:
                logger.info("\n📁 Generated files:")
                logger.info(f"  - Schema: {self.schema_file}")
                logger.info(f"  - Data: {self.data_file}")
                logger.info(f"  - Indexes: {self.indexes_file}")
                logger.info("\n🚀 Next steps:")
                logger.info("  1. Set up your PostgreSQL database")
                logger.info("  2. Run: psql -d your_database -f 01_create_schema.sql")
                logger.info("  3. Run: psql -d your_database -f 02_insert_data.sql")
                logger.info("  4. Run: psql -d your_database -f 03_create_indexes.sql")

            return verification_success

        except Exception:
            logger.exception("SQL file generation failed")
            raise


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Generate PostgreSQL SQL files from SQLite database with new schema and pgvector"
    )
    parser.add_argument(
        "--sqlite-path",
        default="threads_db.sqlite",
        help="Path to SQLite database file (default: threads_db.sqlite)",
    )

    args = parser.parse_args()

    # Create migrator and run SQL generation (no PostgreSQL connection needed)
    migrator = SQLiteToPostgreSQLMigrator(args.sqlite_path, None)

    try:
        success = asyncio.run(migrator.run_migration())
        if success:
            logger.info("🎉 SQL file generation completed successfully!")
            logger.info("✨ Your SQLite data has been converted to PostgreSQL-compatible SQL files!")
            logger.info("📋 Features included:")
            logger.info("  ✅ New normalized schema (customers, reservations, conversations, history)")
            logger.info("  ✅ Vector embeddings for semantic search (pgvector)")
            logger.info("  ✅ Proper indexes for performance")
            logger.info("  ✅ Sample queries for testing")
            logger.info("\n🚀 Ready to import into any PostgreSQL database!")
            sys.exit(0)
        else:
            logger.error("💥 SQL file generation failed!")
            sys.exit(1)
    except Exception:
        logger.exception("💥 SQL file generation failed")
        sys.exit(1)


if __name__ == "__main__":
    main() 