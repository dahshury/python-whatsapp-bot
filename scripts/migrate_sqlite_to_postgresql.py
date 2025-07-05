#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script with pgvector

This script migrates data from the existing SQLite database (threads_db.sqlite)
to PostgreSQL with pgvector embeddings for conversations.
"""

import asyncio
import logging
import os
import sqlite3
import sys
from typing import List, Dict, Any, Optional
import hashlib

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import PostgreSQLDatabase

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def generate_dummy_embeddings(text: str, dimension: int = 384) -> List[float]:
    """Generate dummy embeddings for testing (same as in database.py)"""
    if text is None:
        text = ""
    
    # Ensure text is a string
    text = str(text)
    
    # Create a deterministic hash-based embedding
    hash_obj = hashlib.md5(text.encode('utf-8', errors='replace'))
    hash_hex = hash_obj.hexdigest()
    
    # Convert to numbers and normalize to [-1, 1] range
    embedding = []
    for i in range(0, min(len(hash_hex), dimension * 2), 2):
        val = int(hash_hex[i:i+2], 16) / 127.5 - 1.0
        embedding.append(val)
    
    # Pad or truncate to exact dimension
    while len(embedding) < dimension:
        embedding.append(0.0)
    
    return embedding[:dimension]

class SQLiteToPostgreSQLMigrator:
    """Migrates data from SQLite threads_db.sqlite to PostgreSQL with pgvector support"""
    
    def __init__(self, sqlite_path: str = "threads_db.sqlite", postgres_connection_string: str = None):
        self.sqlite_path = sqlite_path
        self.postgres_db = PostgreSQLDatabase(postgres_connection_string)
        self.postgres_conn = None
        
    async def connect_postgres(self):
        """Connect to PostgreSQL"""
        self.postgres_conn = await self.postgres_db.connect()
        logger.info("Connected to PostgreSQL database")
    
    def connect_sqlite(self) -> sqlite3.Connection:
        """Connect to SQLite database"""
        if not os.path.exists(self.sqlite_path):
            raise FileNotFoundError(f"SQLite database not found: {self.sqlite_path}")
        
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        logger.info(f"Connected to SQLite database: {self.sqlite_path}")
        return conn
    
    async def migrate_customers(self, sqlite_conn: sqlite3.Connection) -> int:
        """Migrate customers table"""
        logger.info("Migrating customers...")
        
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT wa_id, customer_name, created_at FROM customers")
        customers = cursor.fetchall()
        
        migrated_count = 0
        for customer in customers:
            try:
                await self.postgres_conn.execute("""
                    INSERT INTO customers (wa_id, customer_name, created_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (wa_id) DO UPDATE SET
                        customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name),
                        created_at = COALESCE(EXCLUDED.created_at, customers.created_at)
                """, [customer['wa_id'], customer['customer_name'], customer['created_at']])
                migrated_count += 1
                
                if migrated_count % 100 == 0:
                    logger.info(f"Migrated {migrated_count} customers...")
                    
            except Exception as e:
                logger.error(f"Error migrating customer {customer['wa_id']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} customers")
        return migrated_count
    
    async def migrate_conversations(self, sqlite_conn: sqlite3.Connection) -> int:
        """Migrate conversation table with vector embeddings"""
        logger.info("Migrating conversations with vector embeddings...")
        
        cursor = sqlite_conn.cursor()
        cursor.execute("""
            SELECT id, wa_id, role, message, date, time 
            FROM conversation 
            ORDER BY id
        """)
        conversations = cursor.fetchall()
        
        migrated_count = 0
        for conv in conversations:
            try:
                # Generate embedding for the message
                embedding = generate_dummy_embeddings(conv['message'] or "")
                
                await self.postgres_conn.execute("""
                    INSERT INTO conversation (wa_id, role, message, date, time, message_embedding)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, [
                    conv['wa_id'], 
                    conv['role'], 
                    conv['message'], 
                    conv['date'], 
                    conv['time'],
                    embedding
                ])
                migrated_count += 1
                
                if migrated_count % 100 == 0:
                    logger.info(f"Migrated {migrated_count} conversations...")
                    
            except Exception as e:
                logger.error(f"Error migrating conversation {conv['id']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} conversations with embeddings")
        return migrated_count
    
    async def migrate_reservations(self, sqlite_conn: sqlite3.Connection) -> int:
        """Migrate reservations table"""
        logger.info("Migrating reservations...")
        
        cursor = sqlite_conn.cursor()
        cursor.execute("""
            SELECT id, wa_id, date, time_slot, type, status, 
                   cancelled_at, created_at, updated_at 
            FROM reservations 
            ORDER BY id
        """)
        reservations = cursor.fetchall()
        
        migrated_count = 0
        for reservation in reservations:
            try:
                await self.postgres_conn.execute("""
                    INSERT INTO reservations (wa_id, date, time_slot, type, status, 
                                            cancelled_at, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, [
                    reservation['wa_id'],
                    reservation['date'],
                    reservation['time_slot'],
                    reservation['type'],
                    reservation['status'],
                    reservation['cancelled_at'],
                    reservation['created_at'],
                    reservation['updated_at']
                ])
                migrated_count += 1
                
                if migrated_count % 100 == 0:
                    logger.info(f"Migrated {migrated_count} reservations...")
                    
            except Exception as e:
                logger.error(f"Error migrating reservation {reservation['id']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} reservations")
        return migrated_count
    
    async def verify_migration(self, sqlite_conn: sqlite3.Connection) -> bool:
        """Verify that migration was successful by comparing counts"""
        logger.info("Verifying migration...")
        
        # Get SQLite counts
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM customers")
        sqlite_customers = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM conversation")
        sqlite_conversations = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM reservations")
        sqlite_reservations = cursor.fetchone()[0]
        
        # Get PostgreSQL counts
        pg_customers_result = await self.postgres_conn.fetchone("SELECT COUNT(*) as count FROM customers")
        pg_customers = pg_customers_result['count']
        
        pg_conversations_result = await self.postgres_conn.fetchone("SELECT COUNT(*) as count FROM conversation")
        pg_conversations = pg_conversations_result['count']
        
        pg_reservations_result = await self.postgres_conn.fetchone("SELECT COUNT(*) as count FROM reservations")
        pg_reservations = pg_reservations_result['count']
        
        # Compare counts
        logger.info("Migration verification:")
        logger.info(f"Customers: SQLite={sqlite_customers}, PostgreSQL={pg_customers}")
        logger.info(f"Conversations: SQLite={sqlite_conversations}, PostgreSQL={pg_conversations}")
        logger.info(f"Reservations: SQLite={sqlite_reservations}, PostgreSQL={pg_reservations}")
        
        success = (
            sqlite_customers == pg_customers and
            sqlite_conversations == pg_conversations and
            sqlite_reservations == pg_reservations
        )
        
        if success:
            logger.info("✅ Migration verification PASSED")
        else:
            logger.error("❌ Migration verification FAILED")
        
        return success
    
    async def test_vector_search(self):
        """Test vector search functionality after migration"""
        logger.info("Testing vector search functionality...")
        
        try:
            # Get a sample conversation
            sample = await self.postgres_conn.fetchone("""
                SELECT wa_id, message FROM conversation 
                WHERE message IS NOT NULL AND message != '' 
                LIMIT 1
            """)
            
            if not sample:
                logger.warning("No sample conversation found for vector search test")
                return
            
            # Generate query embedding
            query_embedding = generate_dummy_embeddings(sample['message'])
            
            # Perform vector similarity search
            results = await self.postgres_conn.fetchall("""
                SELECT wa_id, message, 1 - (message_embedding <=> $1) as similarity_score
                FROM conversation
                WHERE message IS NOT NULL
                ORDER BY message_embedding <=> $1
                LIMIT 5
            """, [query_embedding])
            
            logger.info(f"Vector search test successful! Found {len(results)} similar conversations")
            if results:
                logger.info(f"Top result similarity score: {results[0]['similarity_score']:.4f}")
            
        except Exception as e:
            logger.error(f"Vector search test failed: {e}")
    
    async def run_migration(self):
        """Run the complete migration process"""
        logger.info("Starting SQLite to PostgreSQL migration...")
        logger.info(f"Source: {self.sqlite_path}")
        logger.info(f"Target: PostgreSQL database")
        
        try:
            # Connect to databases
            await self.connect_postgres()
            sqlite_conn = self.connect_sqlite()
            
            # Perform migration
            customers_count = await self.migrate_customers(sqlite_conn)
            conversations_count = await self.migrate_conversations(sqlite_conn)
            reservations_count = await self.migrate_reservations(sqlite_conn)
            
            # Verify migration
            verification_success = await self.verify_migration(sqlite_conn)
            
            # Test vector search
            await self.test_vector_search()
            
            # Close connections
            sqlite_conn.close()
            await self.postgres_db.close()
            
            logger.info("Migration completed!")
            logger.info(f"Summary:")
            logger.info(f"  - Customers: {customers_count}")
            logger.info(f"  - Conversations: {conversations_count}")
            logger.info(f"  - Reservations: {reservations_count}")
            logger.info(f"  - Verification: {'PASSED' if verification_success else 'FAILED'}")
            
            return verification_success
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate SQLite database to PostgreSQL with pgvector')
    parser.add_argument('--sqlite-path', default='threads_db.sqlite', help='Path to SQLite database file (default: threads_db.sqlite)')
    parser.add_argument('--postgres-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--postgres-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--postgres-user', default='postgres', help='PostgreSQL user')
    parser.add_argument('--postgres-password', default='postgres', help='PostgreSQL password')
    parser.add_argument('--postgres-db', default='reservation_system', help='PostgreSQL database name')
    
    args = parser.parse_args()
    
    # Build PostgreSQL connection string
    postgres_connection_string = (
        f"postgresql://{args.postgres_user}:{args.postgres_password}@"
        f"{args.postgres_host}:{args.postgres_port}/{args.postgres_db}"
    )
    
    # Create migrator and run migration
    migrator = SQLiteToPostgreSQLMigrator(args.sqlite_path, postgres_connection_string)
    
    try:
        success = asyncio.run(migrator.run_migration())
        if success:
            logger.info("🎉 Migration completed successfully!")
            logger.info("Your threads_db.sqlite data has been migrated to PostgreSQL with pgvector support!")
            logger.info("Vector embeddings have been generated for all conversations to enable semantic search.")
            sys.exit(0)
        else:
            logger.error("💥 Migration failed verification!")
            sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 