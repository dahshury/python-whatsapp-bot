"""
PostgreSQL Conversation Repository with Vector Search Support

This repository handles conversation data operations using PostgreSQL with
advanced vector search capabilities for semantic conversation analysis,
intent detection, and similarity matching.
"""

import asyncio
import hashlib
from typing import Any, Dict, List, Optional

from app.database import get_connection, vector_similarity_search
from app.infrastructure.logging import get_service_logger
from app.services.websocket_manager import get_websocket_manager


# Set up domain-specific logger
logger = get_service_logger()


class ConversationRepository:
    """Conversation repository with PostgreSQL and vector search support"""

    def __init__(self):
        self.websocket_manager = None

    async def _get_websocket_manager(self):
        """Get websocket manager instance"""
        if self.websocket_manager is None:
            self.websocket_manager = await get_websocket_manager()
        return self.websocket_manager

    async def _notify_update(self, event_type: str, data: Dict[str, Any]):
        """Send WebSocket notification for real-time updates"""
        try:
            websocket_manager = await self._get_websocket_manager()
            await websocket_manager.broadcast_message(
                {
                    "type": event_type,
                    "data": data,
                    "timestamp": asyncio.get_event_loop().time(),
                }
            )
        except Exception:
            logger.exception("WebSocket notification failed")

    def _generate_simple_embedding(
        self, text: str, dimension: int = 384
    ) -> List[float]:
        """
        Generate a simple embedding for text (placeholder for real embedding model)
        In production, replace this with a real embedding model like OpenAI, Hugging Face, etc.
        """
        if text is None:
            text = ""

        text = str(text)
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

    async def add_conversation(
        self, wa_id: str, role: str, message: str, date: str, time: str
    ) -> bool:
        """
        Add a new conversation message with vector embedding

        Args:
            wa_id: WhatsApp ID of the customer
            role: Role (user/assistant)
            message: The conversation message
            date: Date of the message
            time: Time of the message

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            connection = await get_connection()

            # Generate embedding for the message
            embedding = self._generate_simple_embedding(message)

            await connection.execute(
                """
                INSERT INTO conversation (wa_id, role, message, date, time, message_embedding)
                VALUES ($1, $2, $3, $4, $5, $6)
            """,
                [wa_id, role, message, date, time, embedding],
            )

            # Send real-time notification
            await self._notify_update(
                "conversation_added",
                {
                    "wa_id": wa_id,
                    "role": role,
                    "message": message[:100] + "..." if len(message) > 100 else message,
                    "date": date,
                    "time": time,
                },
            )
        except Exception:
            logger.exception("Error adding conversation")
            return False
        else:
            return True

    async def get_conversations(
        self, wa_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get recent conversations for a customer

        Args:
            wa_id: WhatsApp ID of the customer
            limit: Maximum number of messages to return

        Returns:
            List of conversation dictionaries
        """
        try:
            connection = await get_connection()

            result = await connection.fetchall(
                """
                SELECT id, wa_id, role, message, date, time
                FROM conversation
                WHERE wa_id = $1
                ORDER BY id DESC
                LIMIT $2
            """,
                [wa_id, limit],
            )
        except Exception:
            logger.exception("Error getting conversations")
            return []
        else:
            return result

    async def search_similar_conversations(
        self, query_text: str, limit: int = 10, wa_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find conversations similar to the query text using vector search

        Args:
            query_text: Text to find similar conversations for
            limit: Maximum number of results to return
            wa_id: Optional customer ID to filter results

        Returns:
            List of similar conversations with similarity scores
        """
        try:
            # Generate embedding for query
            query_embedding = self._generate_simple_embedding(query_text)

            # Build WHERE clause
            where_clause = ""
            params = []

            if wa_id:
                where_clause = "wa_id = $1"
                params = [wa_id]

            # Perform vector similarity search
            results = await vector_similarity_search(
                table="conversation",
                embedding_column="message_embedding",
                query_vector=query_embedding,
                limit=limit,
                where_clause=where_clause,
                params=params,
            )
        except Exception:
            logger.exception("Error searching similar conversations")
            return []
        else:
            return results

    async def find_intent_patterns(
        self, intent_keywords: List[str], limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Find conversations that match certain intent patterns using vector search

        Args:
            intent_keywords: List of keywords representing the intent
            limit: Maximum number of results

        Returns:
            List of conversations matching the intent
        """
        try:
            # Create query text from intent keywords
            query_text = " ".join(intent_keywords)

            # Find similar conversations
            similar_conversations = await self.search_similar_conversations(
                query_text=query_text, limit=limit
            )

            # Group by customer and add customer info
            connection = await get_connection()
            enriched_results = []

            for conv in similar_conversations:
                # Get customer info
                customer_result = await connection.fetchone(
                    """
                    SELECT customer_name FROM customers WHERE wa_id = $1
                """,
                    [conv.get("wa_id")],
                )

                conv["customer_name"] = (
                    customer_result["customer_name"] if customer_result else "Unknown"
                )
                enriched_results.append(conv)
        except Exception:
            logger.exception("Error finding intent patterns")
            return []
        else:
            return enriched_results

    async def analyze_conversation_sentiment(
        self, wa_id: str, days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze conversation patterns and sentiment for a customer

        Args:
            wa_id: Customer's WhatsApp ID
            days_back: Number of days to analyze

        Returns:
            Dict containing conversation analysis
        """
        try:
            connection = await get_connection()

            # Get recent conversations using PostgreSQL date functions
            result = await connection.fetchall(
                """
                SELECT role, message, date, time
                FROM conversation
                WHERE wa_id = $1
                  AND date >= (CURRENT_DATE - INTERVAL '%s days')::text
                ORDER BY id DESC
            """,
                [wa_id, days_back],
            )

            conversations = result

            # Basic analysis
            total_messages = len(conversations)
            user_messages = len([c for c in conversations if c["role"] == "user"])
            bot_messages = len([c for c in conversations if c["role"] == "assistant"])

            # Word count analysis
            total_words = sum(
                len(c["message"].split()) for c in conversations if c["message"]
            )
            avg_words_per_message = (
                round(total_words / total_messages, 2) if total_messages > 0 else 0
            )

            # Look for common patterns
            reservation_keywords = [
                "reservation",
                "book",
                "table",
                "reserve",
                "appointment",
            ]
            inquiry_keywords = ["what", "how", "when", "where", "can you", "help"]
            complaint_keywords = [
                "problem",
                "issue",
                "wrong",
                "error",
                "cancel",
                "disappointed",
            ]

            reservation_messages = 0
            inquiry_messages = 0
            complaint_messages = 0

            for conv in conversations:
                message_lower = conv["message"].lower() if conv["message"] else ""

                if any(keyword in message_lower for keyword in reservation_keywords):
                    reservation_messages += 1
                if any(keyword in message_lower for keyword in inquiry_keywords):
                    inquiry_messages += 1
                if any(keyword in message_lower for keyword in complaint_keywords):
                    complaint_messages += 1

            return {
                "wa_id": wa_id,
                "analysis_period_days": days_back,
                "total_messages": total_messages,
                "user_messages": user_messages,
                "bot_messages": bot_messages,
                "avg_words_per_message": avg_words_per_message,
                "patterns": {
                    "reservation_intent": reservation_messages,
                    "inquiry_intent": inquiry_messages,
                    "complaint_intent": complaint_messages,
                },
                "engagement_score": round(
                    (user_messages / total_messages * 100) if total_messages > 0 else 0,
                    2,
                ),
            }

        except Exception:
            logger.exception("Error analyzing conversation sentiment")
            return {"error": "Error analyzing conversation sentiment"}

    async def get_conversation_insights(
        self, limit_customers: int = 100
    ) -> Dict[str, Any]:
        """
        Get insights across all customer conversations using vector analysis

        Args:
            limit_customers: Limit analysis to top N active customers

        Returns:
            Dict containing conversation insights
        """
        try:
            connection = await get_connection()

            # Get most active customers
            active_customers = await connection.fetchall(
                """
                SELECT wa_id, COUNT(*) as message_count
                FROM conversation
                GROUP BY wa_id
                ORDER BY message_count DESC
                LIMIT $1
            """,
                [limit_customers],
            )

            # Analyze common topics using keyword frequency
            all_messages = await connection.fetchall("""
                SELECT message FROM conversation
                WHERE message IS NOT NULL AND message != ''
                ORDER BY id DESC
                LIMIT 1000
            """)

            # Simple keyword frequency analysis
            word_freq = {}
            for msg in all_messages:
                words = msg["message"].lower().split()
                for word in words:
                    if len(word) > 3:  # Only count words longer than 3 characters
                        word_freq[word] = word_freq.get(word, 0) + 1

            # Get top keywords
            top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[
                :20
            ]

            # Get total statistics
            total_conversations = await connection.fetchone(
                "SELECT COUNT(*) as total FROM conversation"
            )
            total_customers = await connection.fetchone(
                "SELECT COUNT(DISTINCT wa_id) as total FROM conversation"
            )

            return {
                "total_conversations": total_conversations["total"]
                if total_conversations
                else 0,
                "total_active_customers": total_customers["total"]
                if total_customers
                else 0,
                "top_active_customers": active_customers[:10],
                "trending_keywords": [
                    {"word": word, "frequency": freq} for word, freq in top_keywords
                ],
                "analysis_timestamp": asyncio.get_event_loop().time(),
            }

        except Exception:
            logger.exception("Error getting conversation insights")
            return {"error": "Error getting conversation insights"}

    async def search_conversations_by_keyword(
        self, keyword: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search conversations by keyword (traditional text search)

        Args:
            keyword: Keyword to search for
            limit: Maximum number of results

        Returns:
            List of matching conversations
        """
        try:
            connection = await get_connection()

            result = await connection.fetchall(
                """
                SELECT c.id, c.wa_id, c.role, c.message, c.date, c.time, cust.customer_name
                FROM conversation c
                LEFT JOIN customers cust ON c.wa_id = cust.wa_id
                WHERE c.message ILIKE $1
                ORDER BY c.id DESC
                LIMIT $2
            """,
                [f"%{keyword}%", limit],
            )
        except Exception:
            logger.exception("Error searching conversations by keyword")
            return []
        else:
            return result

    async def delete_conversation(self, conversation_id: int) -> bool:
        """
        Delete a specific conversation message

        Args:
            conversation_id: ID of the conversation to delete

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            connection = await get_connection()

            result = await connection.execute(
                """
                DELETE FROM conversation WHERE id = $1
            """,
                [conversation_id],
            )

            if result.get("changes", 0) > 0:
                # Send real-time notification
                await self._notify_update(
                    "conversation_deleted", {"conversation_id": conversation_id}
                )
                return True
            else:
                return False
        except Exception:
            logger.exception("Error deleting conversation")
            return False


# Singleton pattern for repository instance
class ConversationRepositoryManager:
    """Singleton manager for conversation repository instances"""
    _instance = None
    _repository = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_repository(self) -> ConversationRepository:
        """Get the singleton conversation repository instance"""
        if self._repository is None:
            self._repository = ConversationRepository()
        return self._repository


async def get_conversation_repository() -> ConversationRepository:
    """Get the global conversation repository instance"""
    manager = ConversationRepositoryManager()
    return await manager.get_repository()
