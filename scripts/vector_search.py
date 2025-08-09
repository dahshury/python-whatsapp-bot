#!/usr/bin/env python3
"""
Vector Search Script for Conversation Embeddings

This script provides command-line interface for searching conversation embeddings
using pgvector's similarity search capabilities.
"""

import argparse
import asyncio
import sys
from pathlib import Path
from typing import List, Optional

from app.database import (
    PostgreSQLDatabase,
    generate_dummy_embeddings,
    vector_similarity_search,
)
from app.infrastructure.logging import get_vector_search_logger


# Add parent directory to path to import app modules
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))


# Set up domain-specific logger
logger = get_vector_search_logger()


class ConversationVectorSearch:
    """Vector search interface for conversation embeddings"""

    def __init__(self, connection_string: Optional[str] = None):
        self.db = PostgreSQLDatabase(connection_string)
        self.conn = None

    async def connect(self):
        """Connect to database"""
        self.conn = await self.db.connect()
        logger.info("Connected to PostgreSQL database")

    async def close(self):
        """Close database connection"""
        if self.db:
            await self.db.close()

    async def search_conversations(
        self,
        query_text: str,
        limit: int = 10,
        wa_id: Optional[str] = None,
        min_similarity: float = 0.0,
    ) -> List[dict]:
        """
        Search for conversations similar to query text

        Args:
            query_text: Text to search for
            limit: Maximum number of results
            wa_id: Optional filter by WhatsApp ID
            min_similarity: Minimum similarity score (0.0 to 1.0)

        Returns:
            List of conversation records with similarity scores
        """
        logger.info(f"Searching for conversations similar to: '{query_text}'")

        # Generate embedding for query
        query_embedding = generate_dummy_embeddings(query_text)

        # Build where clause
        where_clause = ""
        params = []

        if wa_id:
            where_clause = "wa_id = $1"
            params = [wa_id]

        # Add similarity threshold
        if min_similarity > 0.0:
            if where_clause:
                where_clause += f" AND (1 - (message_embedding <=> ${len(params) + 1})) >= ${len(params) + 2}"
                params.extend([query_embedding, min_similarity])
            else:
                where_clause = "(1 - (message_embedding <=> $1)) >= $2"
                params = [query_embedding, min_similarity]

        # Perform vector search
        results = await vector_similarity_search(
            table="conversation",
            embedding_column="message_embedding",
            query_vector=query_embedding,
            limit=limit,
            where_clause=where_clause,
            params=params[2:] if min_similarity > 0.0 and wa_id else params,
        )

        # Filter by minimum similarity if not done in query
        if min_similarity > 0.0 and not where_clause:
            results = [r for r in results if r.get("similarity_score", 0) >= min_similarity]

        logger.info(f"Found {len(results)} similar conversations")
        return results

    async def search_by_wa_id(self, wa_id: str, limit: int = 50) -> List[dict]:
        """Get all conversations for a specific WhatsApp ID"""
        logger.info(f"Fetching conversations for WhatsApp ID: {wa_id}")

        results = await self.conn.fetchall(
            """
            SELECT id, wa_id, role, message, date, time
            FROM conversation
            WHERE wa_id = $1
            ORDER BY date DESC, time DESC
            LIMIT $2
            """,
            [wa_id, limit]
        )

        logger.info(f"Found {len(results)} conversations for {wa_id}")
        return results

    async def get_conversation_stats(self) -> dict:
        """Get statistics about conversation embeddings"""
        logger.info("Fetching conversation statistics...")

        stats = await self.conn.fetchone("""
            SELECT
                COUNT(*) as total_conversations,
                COUNT(DISTINCT wa_id) as unique_users,
                COUNT(message_embedding) as conversations_with_embeddings,
                AVG(LENGTH(message)) as avg_message_length
            FROM conversation
            WHERE message IS NOT NULL
        """)

        return stats

    async def find_most_similar_pairs(self, limit: int = 10) -> List[dict]:
        """Find the most similar conversation pairs"""
        logger.info("Finding most similar conversation pairs...")

        results = await self.conn.fetchall("""
            WITH similarities AS (
                SELECT
                    c1.id as id1,
                    c2.id as id2,
                    c1.message as message1,
                    c2.message as message2,
                    c1.wa_id as wa_id1,
                    c2.wa_id as wa_id2,
                    1 - (c1.message_embedding <=> c2.message_embedding) as similarity_score
                FROM conversation c1
                JOIN conversation c2 ON c1.id < c2.id
                WHERE c1.message_embedding IS NOT NULL
                AND c2.message_embedding IS NOT NULL
                AND c1.message != c2.message
                ORDER BY similarity_score DESC
                LIMIT $1
            )
            SELECT * FROM similarities
            WHERE similarity_score > 0.7
        """, [limit])

        logger.info(f"Found {len(results)} similar conversation pairs")
        return results

    async def search_conversations_by_keywords(
        self, keywords: List[str], limit: int = 20
    ) -> List[dict]:
        """Search conversations containing specific keywords"""
        logger.info(f"Searching for conversations with keywords: {keywords}")

        # Create a combined query from keywords
        query_text = " ".join(keywords)

        # Use vector search for semantic similarity
        semantic_results = await self.search_conversations(query_text, limit)

        # Also do keyword-based search
        keyword_pattern = "|".join(keywords)
        keyword_results = await self.conn.fetchall("""
            SELECT id, wa_id, role, message, date, time,
                   0.5 as similarity_score
            FROM conversation
            WHERE message ~* $1
            ORDER BY date DESC, time DESC
            LIMIT $2
        """, [keyword_pattern, limit])

        # Combine and deduplicate results
        seen_ids = set()
        combined_results = []

        for result in semantic_results + keyword_results:
            if result["id"] not in seen_ids:
                seen_ids.add(result["id"])
                combined_results.append(result)

        # Sort by similarity score
        combined_results.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)

        logger.info(f"Found {len(combined_results)} conversations with keywords")
        return combined_results[:limit]

    async def update_missing_embeddings(self, batch_size: int = 100) -> int:
        """Update conversations that don't have embeddings"""
        logger.info("Updating missing conversation embeddings...")

        # Find conversations without embeddings
        conversations = await self.conn.fetchall("""
            SELECT id, message
            FROM conversation
            WHERE message_embedding IS NULL
            AND message IS NOT NULL
            AND message != ''
            ORDER BY id
            LIMIT $1
        """, [batch_size])

        if not conversations:
            logger.info("No conversations found without embeddings")
            return 0

        updated_count = 0
        update_errors = []
        for conv in conversations:
            try:
                # Generate embedding for the message
                embedding = generate_dummy_embeddings(conv["message"] or "")

                # Update the conversation with embedding
                await self.conn.execute(
                    """
                    UPDATE conversation
                    SET message_embedding = $1
                    WHERE id = $2
                """,
                    [embedding, conv["id"]],
                )

                updated_count += 1
                if updated_count % 100 == 0:
                    logger.info(f"Updated {updated_count} embeddings...")

            except Exception as e:
                update_errors.append((conv["id"], str(e)))

        # Log all update errors at once
        if update_errors:
            logger.exception("Errors updating embeddings for conversations: %s", update_errors)

        logger.info(f"Successfully updated {updated_count} conversation embeddings")
        return updated_count


def format_conversation_results(results: List[dict], show_embeddings: bool = False):
    """Format conversation search results for display"""
    if not results:
        print("No conversations found.")
        return

    print(f"\n{'='*80}")
    print(f"Found {len(results)} conversations:")
    print(f"{'='*80}")

    for i, result in enumerate(results, 1):
        similarity = result.get("similarity_score", 0)

        print(f"\n{i}. WhatsApp ID: {result['wa_id']}")
        print(f"   Role: {result['role']}")
        print(f"   Date: {result['date']} {result['time']}")
        if similarity > 0:
            print(f"   Similarity: {similarity:.4f}")
        print(f"   Message: {result['message'][:200]}{'...' if len(result['message']) > 200 else ''}")

        if show_embeddings and "message_embedding" in result:
            embedding = result["message_embedding"]
            if embedding:
                print(f"   Embedding: [{embedding[0]:.4f}, {embedding[1]:.4f}, ...] (384 dimensions)")


async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Vector search for conversation embeddings")
    parser.add_argument("--postgres-host", default="localhost", help="PostgreSQL host")
    parser.add_argument("--postgres-port", default="5432", help="PostgreSQL port")
    parser.add_argument("--postgres-user", default="postgres", help="PostgreSQL user")
    parser.add_argument("--postgres-password", default="postgres", help="PostgreSQL password")
    parser.add_argument("--postgres-db", default="reservation_system", help="PostgreSQL database")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Search command
    search_parser = subparsers.add_parser("search", help="Search conversations by text")
    search_parser.add_argument("query", help="Text to search for")
    search_parser.add_argument("--limit", type=int, default=10, help="Maximum results")
    search_parser.add_argument("--wa-id", help="Filter by WhatsApp ID")
    search_parser.add_argument("--min-similarity", type=float, default=0.0, help="Minimum similarity score")

    # User conversations command
    user_parser = subparsers.add_parser("user", help="Get conversations for a user")
    user_parser.add_argument("wa_id", help="WhatsApp ID")
    user_parser.add_argument("--limit", type=int, default=50, help="Maximum results")

    # Stats command
    subparsers.add_parser("stats", help="Get conversation statistics")

    # Similar pairs command
    pairs_parser = subparsers.add_parser("pairs", help="Find most similar conversation pairs")
    pairs_parser.add_argument("--limit", type=int, default=10, help="Maximum pairs")

    # Keywords command
    keywords_parser = subparsers.add_parser("keywords", help="Search by keywords")
    keywords_parser.add_argument("keywords", nargs="+", help="Keywords to search for")
    keywords_parser.add_argument("--limit", type=int, default=20, help="Maximum results")

    # Update embeddings command
    update_parser = subparsers.add_parser("update", help="Update missing embeddings")
    update_parser.add_argument("--batch-size", type=int, default=100, help="Batch size for updates")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Build connection string
    connection_string = (
        f"postgresql://{args.postgres_user}:{args.postgres_password}@"
        f"{args.postgres_host}:{args.postgres_port}/{args.postgres_db}"
    )

    # Create search instance
    search = ConversationVectorSearch(connection_string)

    try:
        await search.connect()

        if args.command == "search":
            results = await search.search_conversations(
                query_text=args.query,
                limit=args.limit,
                wa_id=args.wa_id,
                min_similarity=args.min_similarity
            )
            format_conversation_results(results)

        elif args.command == "user":
            results = await search.search_by_wa_id(args.wa_id, args.limit)
            format_conversation_results(results)

        elif args.command == "stats":
            stats = await search.get_conversation_stats()
            print(f"\n{'='*50}")
            print("Conversation Statistics:")
            print(f"{'='*50}")
            print(f"Total conversations: {stats['total_conversations']:,}")
            print(f"Unique users: {stats['unique_users']:,}")
            print(f"Conversations with embeddings: {stats['conversations_with_embeddings']:,}")
            print(f"Average message length: {stats['avg_message_length']:.1f} characters")

        elif args.command == "pairs":
            results = await search.find_most_similar_pairs(args.limit)
            print(f"\n{'='*80}")
            print("Most Similar Conversation Pairs:")
            print(f"{'='*80}")
            for i, result in enumerate(results, 1):
                print(f"\n{i}. Similarity Score: {result['similarity_score']:.4f}")
                print(f"   User 1: {result['wa_id1']} - {result['message1'][:100]}...")
                print(f"   User 2: {result['wa_id2']} - {result['message2'][:100]}...")

        elif args.command == "keywords":
            results = await search.search_conversations_by_keywords(args.keywords, args.limit)
            format_conversation_results(results)

        elif args.command == "update":
            updated = await search.update_missing_embeddings(args.batch_size)
            print(f"\n✅ Updated {updated} conversation embeddings")

    except Exception:
        logger.exception("Vector search operation failed")
        sys.exit(1)
    finally:
        await search.close()


if __name__ == "__main__":
    asyncio.run(main())
