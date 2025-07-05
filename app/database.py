"""
PostgreSQL Database Connection Manager with pgvector

This module provides async database operations using PostgreSQL with pgvector extension.
"""

import asyncio
import json
import os
import asyncpg
import numpy as np
from typing import Any, Dict, List, Optional, Union
from pgvector.asyncpg import register_vector

class PostgreSQLConnection:
    """Async PostgreSQL connection with pgvector support"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connection: Optional[asyncpg.Connection] = None
    
    async def connect(self) -> asyncpg.Connection:
        """Get or create a database connection"""
        if self.connection is None or self.connection.is_closed():
            self.connection = await asyncpg.connect(self.connection_string)
            # Register pgvector types
            await register_vector(self.connection)
        return self.connection

    async def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute a single SQL statement with PostgreSQL syntax"""
        if params is None:
            params = []
        
        connection = await self.connect()
        
        try:
            # For INSERT/UPDATE/DELETE operations
            if sql.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                result = await connection.execute(sql, *params)
                # Parse result like "INSERT 0 1" or "UPDATE 3"
                parts = result.split()
                if len(parts) >= 2:
                    changes = int(parts[-1])
                else:
                    changes = 0
                
                return {
                    'success': True,
                    'changes': changes,
                    'lastInsertRowid': None,  # PostgreSQL doesn't have this concept
                    'rows': [],
                    'columns': []
                }
            else:
                # For SELECT operations
                rows = await connection.fetch(sql, *params)
                if rows:
                    # Convert asyncpg.Record to dict
                    result_rows = [dict(row) for row in rows]
                    columns = list(rows[0].keys()) if rows else []
                else:
                    result_rows = []
                    columns = []
                
                return {
                    'success': True,
                    'rows': result_rows,
                    'changes': 0,
                    'lastInsertRowid': None,
                    'columns': columns
                }
                
        except Exception as e:
            raise RuntimeError(f"PostgreSQL operation failed: {e}")
    
    async def fetchall(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        """Execute query and return all rows"""
        if params is None:
            params = []
        
        connection = await self.connect()
        
        try:
            rows = await connection.fetch(sql, *params)
            return [dict(row) for row in rows]
        except Exception as e:
            raise RuntimeError(f"PostgreSQL fetchall failed: {e}")
    
    async def fetchone(self, sql: str, params: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        """Execute query and return first row"""
        if params is None:
            params = []
        
        connection = await self.connect()
        
        try:
            row = await connection.fetchrow(sql, *params)
            return dict(row) if row else None
        except Exception as e:
            raise RuntimeError(f"PostgreSQL fetchone failed: {e}")
    
    async def executemany(self, sql: str, params_list: List[List[Any]]) -> Dict[str, Any]:
        """Execute SQL statement multiple times with different parameters"""
        connection = await self.connect()
        
        try:
            async with connection.transaction():
                total_changes = 0
                for params in params_list:
                    result = await connection.execute(sql, *params)
                    # Parse result to get affected rows
                    parts = result.split()
                    if len(parts) >= 2:
                        total_changes += int(parts[-1])
                
                return {
                    'success': True,
                    'changes': total_changes,
                    'results': []
                }
                
        except Exception as e:
            raise RuntimeError(f"PostgreSQL executemany failed: {e}")
    
    async def batch(self, statements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple statements in a transaction"""
        connection = await self.connect()
        
        try:
            async with connection.transaction():
                results = []
                for stmt in statements:
                    sql = stmt.get('sql', stmt.get('q', ''))
                    params = stmt.get('args', stmt.get('params', []))
                    result = await self.execute(sql, params)
                    results.append(result)
                
                return {
                    'success': True,
                    'results': results
                }
                
        except Exception as e:
            raise RuntimeError(f"PostgreSQL batch operation failed: {e}")
    
    async def close(self):
        """Close the connection"""
        if self.connection and not self.connection.is_closed():
            await self.connection.close()

class PostgreSQLDatabase:
    """Main database class for PostgreSQL operations"""
    
    def __init__(self, connection_string: str = None):
        # Build connection string from environment variables or use provided one
        if connection_string:
            self.connection_string = connection_string
        else:
            host = os.getenv('POSTGRES_HOST', 'localhost')
            port = os.getenv('POSTGRES_PORT', '5432')
            user = os.getenv('POSTGRES_USER', 'postgres')
            password = os.getenv('POSTGRES_PASSWORD', 'postgres')
            database = os.getenv('POSTGRES_DB', 'reservation_system')
            
            self.connection_string = f"postgresql://{user}:{password}@{host}:{port}/{database}"
        
        self.connection: Optional[PostgreSQLConnection] = None
    
    async def connect(self) -> PostgreSQLConnection:
        """Get or create a database connection"""
        if self.connection is None:
            self.connection = PostgreSQLConnection(self.connection_string)
            await self._initialize_database()
        return self.connection
    
    async def _initialize_database(self):
        """Initialize database with tables and pgvector extension"""
        connection = self.connection
        
        # Enable pgvector extension
        await connection.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # Create tables
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                wa_id TEXT PRIMARY KEY,
                customer_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS conversation (
                id SERIAL PRIMARY KEY,
                wa_id TEXT,
                role TEXT,
                message TEXT,
                date TEXT,
                time TEXT,
                message_embedding vector(384),
                FOREIGN KEY (wa_id) REFERENCES customers (wa_id)
            )
        """)
        
        # Create vector index for faster similarity search
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS conversation_embedding_idx 
            ON conversation USING ivfflat (message_embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id SERIAL PRIMARY KEY,
                wa_id TEXT,
                date TEXT,
                time_slot TEXT,
                type INTEGER CHECK(type IN (0, 1)),
                status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wa_id) REFERENCES customers(wa_id)
            )
        """)
    
    async def close(self):
        """Close database connection"""
        if self.connection:
            await self.connection.close()
            self.connection = None

# Global database instance
_db_instance: Optional[PostgreSQLDatabase] = None

async def get_database() -> PostgreSQLDatabase:
    """Get the global database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = PostgreSQLDatabase()
    return _db_instance

async def get_connection() -> PostgreSQLConnection:
    """Get a database connection"""
    db = await get_database()
    return await db.connect()

# Vector search utilities
async def vector_similarity_search(
    table: str,
    embedding_column: str,
    query_vector: List[float],
    limit: int = 10,
    where_clause: str = "",
    params: Optional[List[Any]] = None
) -> List[Dict[str, Any]]:
    """
    Perform vector similarity search using pgvector's cosine distance
    
    Args:
        table: Table name to search
        embedding_column: Column containing vector embeddings
        query_vector: Query vector for similarity search
        limit: Maximum number of results
        where_clause: Optional WHERE clause for filtering (use $N placeholders)
        params: Parameters for the WHERE clause
    
    Returns:
        List of results with similarity scores
    """
    connection = await get_connection()
    
    # Build query with vector similarity search using pgvector
    where_part = f"WHERE {where_clause}" if where_clause else ""
    
    # Adjust parameter indices based on query_vector being first parameter
    if where_clause and params:
        # Replace parameter placeholders to account for query_vector being $1
        adjusted_where = where_clause
        for i in range(len(params), 0, -1):
            adjusted_where = adjusted_where.replace(f"${i}", f"${i + 1}")
        where_part = f"WHERE {adjusted_where}" if adjusted_where else ""
    
    sql = f"""
        SELECT *, 1 - ({embedding_column} <=> $1) as similarity_score
        FROM {table}
        {where_part}
        ORDER BY {embedding_column} <=> $1
        LIMIT ${len((params or [])) + 2}
    """
    
    # Prepare parameters: query_vector first, then where_clause params, then limit
    search_params = [query_vector] + (params or []) + [limit]
    
    return await connection.fetchall(sql, search_params)

async def vector_top_k_search(
    table: str,
    embedding_column: str,
    query_vector: List[float],
    k: int = 10,
    where_clause: str = "",
    params: Optional[List[Any]] = None
) -> List[Dict[str, Any]]:
    """
    Perform approximate vector search using pgvector's index
    
    Args:
        table: Table name to search
        embedding_column: Column containing vector embeddings
        query_vector: Query vector
        k: Number of results to return
        where_clause: Optional WHERE clause for filtering (use $N placeholders)
        params: Parameters for the WHERE clause
    
    Returns:
        List of results from approximate search
    """
    return await vector_similarity_search(
        table=table,
        embedding_column=embedding_column,
        query_vector=query_vector,
        limit=k,
        where_clause=where_clause,
        params=params
    )

# Convenience functions for common operations
async def insert_with_vector(
    table: str,
    data: Dict[str, Any],
    embedding_column: str,
    embedding_vector: List[float]
) -> Dict[str, Any]:
    """Insert a record with a vector embedding"""
    connection = await get_connection()
    
    # Prepare columns and values
    columns = list(data.keys()) + [embedding_column]
    placeholders = [f"${i+1}" for i in range(len(data))] + [f"${len(data)+1}"]
    values = list(data.values()) + [embedding_vector]
    
    sql = f"""
        INSERT INTO {table} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
    """
    
    return await connection.execute(sql, values)

def generate_dummy_embeddings(text: str, dimension: int = 384) -> List[float]:
    """Generate dummy embeddings for testing (replace with real embeddings later)"""
    import hashlib
    
    # Handle None or empty text
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

# Conversation-specific vector search functions
async def search_similar_conversations(
    query_text: str,
    limit: int = 10,
    wa_id: str = None
) -> List[Dict[str, Any]]:
    """Search for conversations similar to the query text"""
    # Generate embedding for query text
    query_embedding = generate_dummy_embeddings(query_text)
    
    # Build where clause for specific user
    where_clause = ""
    params = []
    if wa_id:
        where_clause = "wa_id = $1"
        params = [wa_id]
    
    return await vector_similarity_search(
        table="conversation",
        embedding_column="message_embedding",
        query_vector=query_embedding,
        limit=limit,
        where_clause=where_clause,
        params=params
    )

async def insert_conversation_with_embedding(
    wa_id: str,
    role: str,
    message: str,
    date: str,
    time: str
) -> Dict[str, Any]:
    """Insert a conversation message with auto-generated embedding"""
    connection = await get_connection()
    
    # Generate embedding for the message
    embedding = generate_dummy_embeddings(message)
    
    sql = """
        INSERT INTO conversation (wa_id, role, message, date, time, message_embedding)
        VALUES ($1, $2, $3, $4, $5, $6)
    """
    
    return await connection.execute(sql, [wa_id, role, message, date, time, embedding]) 