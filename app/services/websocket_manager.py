import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set

import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException
from websockets.server import WebSocketServerProtocol

from app.infrastructure.logging import get_service_logger


# Set up domain-specific logger
logger = get_service_logger()


class UpdateType(Enum):
    """Enumeration of different update types for WebSocket notifications."""

    RESERVATION_CREATED = "reservation_created"
    RESERVATION_UPDATED = "reservation_updated"
    RESERVATION_CANCELLED = "reservation_cancelled"
    RESERVATION_REINSTATED = "reservation_reinstated"
    CONVERSATION_NEW_MESSAGE = "conversation_new_message"
    VACATION_PERIOD_UPDATED = "vacation_period_updated"
    CUSTOMER_UPDATED = "customer_updated"


@dataclass
class WebSocketMessage:
    """Data structure for WebSocket messages."""

    type: UpdateType
    timestamp: str
    data: Dict[str, Any]
    affected_entities: List[str] = None  # List of IDs that were affected

    def to_json(self) -> str:
        """Convert message to JSON string."""
        message_dict = asdict(self)
        message_dict["type"] = self.type.value
        return json.dumps(message_dict, default=str)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts real-time updates.
    Supports filtering updates by entity types and IDs.
    """

    def __init__(self):
        """Initialize the WebSocket manager."""
        self._connections: Set[WebSocketServerProtocol] = set()
        self._connection_filters: Dict[WebSocketServerProtocol, Dict[str, Any]] = {}
        self._server = None
        self._running = False

    async def start_server(self, host: str = "0.0.0.0", port: int = 8765):
        """
        Start the WebSocket server.

        Args:
            host: Host to bind the server to
            port: Port to bind the server to
        """
        try:
            # Use a wrapper function to handle the connection properly
            async def connection_handler(websocket):
                await self._handle_connection(websocket)

            self._server = await websockets.serve(
                connection_handler,
                host,
                port,
                ping_interval=30,
                ping_timeout=10,
                close_timeout=10,
            )
            self._running = True
            logger.info("WebSocket server started on ws://%s:%s", host, port)
        except (OSError, RuntimeError, ValueError):
            logger.exception("Failed to start WebSocket server")
            raise

    async def stop_server(self):
        """Stop the WebSocket server and close all connections."""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._running = False

        # Close all connections
        if self._connections:
            await asyncio.gather(
                *[connection.close() for connection in self._connections],
                return_exceptions=True,
            )
        self._connections.clear()
        self._connection_filters.clear()
        logger.info("WebSocket server stopped")

    async def _handle_connection(self, websocket: WebSocketServerProtocol):
        """
        Handle a new WebSocket connection.

        Args:
            websocket: WebSocket connection
        """
        self._connections.add(websocket)
        self._connection_filters[websocket] = {}

        try:
            logger.info("New WebSocket connection from %s", websocket.remote_address)

            # Send initial connection confirmation
            welcome_message = WebSocketMessage(
                type=UpdateType.RESERVATION_CREATED,  # Using as a generic type
                timestamp=datetime.now().isoformat(),
                data={
                    "message": "Connected to real-time updates",
                    "status": "connected",
                },
            )
            await websocket.send(welcome_message.to_json())

            # Listen for client messages (for potential filtering setup)
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON received from %s", websocket.remote_address
                    )
                except (ValueError, KeyError, TypeError):
                    logger.exception("Error handling client message")

        except ConnectionClosed:
            logger.info("WebSocket connection closed: %s", websocket.remote_address)
        except WebSocketException:
            logger.warning("WebSocket error occurred")
        except (RuntimeError, OSError, ValueError):
            logger.exception("Unexpected error in WebSocket connection")
        finally:
            self._connections.discard(websocket)
            self._connection_filters.pop(websocket, None)

    async def _handle_client_message(
        self, websocket: WebSocketServerProtocol, data: Dict[str, Any]
    ):
        """
        Handle messages from clients (for setting up filters, etc.).

        Args:
            websocket: WebSocket connection
            data: Message data from client
        """
        message_type = data.get("type")

        if message_type == "set_filter":
            # Allow clients to filter updates by entity types or IDs
            filters = data.get("filters", {})
            self._connection_filters[websocket] = filters

            response = WebSocketMessage(
                type=UpdateType.RESERVATION_CREATED,  # Generic type
                timestamp=datetime.now().isoformat(),
                data={"message": "Filters updated", "filters": filters},
            )
            await websocket.send(response.to_json())

        elif message_type == "ping":
            # Handle ping from client
            pong = WebSocketMessage(
                type=UpdateType.RESERVATION_CREATED,  # Generic type
                timestamp=datetime.now().isoformat(),
                data={"message": "pong"},
            )
            await websocket.send(pong.to_json())

    def _should_send_to_connection(
        self, websocket: WebSocketServerProtocol, message: WebSocketMessage
    ) -> bool:
        """
        Check if a message should be sent to a specific connection based on filters.

        Args:
            websocket: WebSocket connection
            message: Message to check

        Returns:
            True if message should be sent, False otherwise
        """
        filters = self._connection_filters.get(websocket, {})

        # If no filters set, send all messages
        if not filters:
            return True

        # Check update type filter
        if "update_types" in filters:
            allowed_types = filters["update_types"]
            if message.type.value not in allowed_types:
                return False

        # Check entity ID filter
        if "entity_ids" in filters and message.affected_entities:
            allowed_ids = set(filters["entity_ids"])
            message_ids = set(message.affected_entities)
            if not allowed_ids.intersection(message_ids):
                return False

        return True

    async def broadcast_update(
        self,
        update_type: UpdateType,
        data: Dict[str, Any],
        affected_entities: Optional[List[str]] = None,
    ):
        """
        Broadcast an update to all connected WebSocket clients.

        Args:
            update_type: Type of update
            data: Update data
            affected_entities: List of entity IDs affected by this update
        """
        if not self._connections:
            return

        message = WebSocketMessage(
            type=update_type,
            timestamp=datetime.now().isoformat(),
            data=data,
            affected_entities=affected_entities or [],
        )

        # Send to all connected clients
        disconnected = set()
        send_errors = []
        for websocket in self._connections:
            try:
                if self._should_send_to_connection(websocket, message):
                    await websocket.send(message.to_json())
            except ConnectionClosed:
                disconnected.add(websocket)
            except (RuntimeError, OSError, ValueError) as e:
                send_errors.append((websocket, str(e)))

        # Log all send errors at once
        if send_errors:
            logger.exception("Errors sending message to WebSocket clients: %s", send_errors)

        # Remove disconnected clients
        self._connections.difference_update(disconnected)

    async def broadcast_reservation_update(
        self, action: str, reservation_data: Dict[str, Any]
    ):
        """
        Broadcast reservation-specific updates.

        Args:
            action: Action performed (created, updated, cancelled, reinstated)
            reservation_data: Reservation data
        """
        update_type_map = {
            "created": UpdateType.RESERVATION_CREATED,
            "updated": UpdateType.RESERVATION_UPDATED,
            "cancelled": UpdateType.RESERVATION_CANCELLED,
            "reinstated": UpdateType.RESERVATION_REINSTATED,
        }

        update_type = update_type_map.get(action, UpdateType.RESERVATION_UPDATED)
        affected_entities = [
            str(reservation_data.get("id", "")),
            reservation_data.get("wa_id", ""),
        ]

        await self.broadcast_update(update_type, reservation_data, affected_entities)

    async def broadcast_conversation_update(self, conversation_data: Dict[str, Any]):
        """
        Broadcast conversation message updates.

        Args:
            conversation_data: Conversation message data
        """
        affected_entities = [conversation_data.get("wa_id", "")]
        await self.broadcast_update(
            UpdateType.CONVERSATION_NEW_MESSAGE, conversation_data, affected_entities
        )

    async def broadcast_vacation_update(self, vacation_data: Dict[str, Any]):
        """
        Broadcast vacation period updates.

        Args:
            vacation_data: Vacation period data
        """
        await self.broadcast_update(UpdateType.VACATION_PERIOD_UPDATED, vacation_data)

    async def broadcast_customer_update(self, customer_data: Dict[str, Any]):
        """
        Broadcast customer updates.

        Args:
            customer_data: Customer data
        """
        affected_entities = [customer_data.get("wa_id", "")]
        await self.broadcast_update(
            UpdateType.CUSTOMER_UPDATED, customer_data, affected_entities
        )

    @property
    def is_running(self) -> bool:
        """Check if the WebSocket server is running."""
        return self._running

    @property
    def connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self._connections)


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


async def get_websocket_manager() -> WebSocketManager:
    """
    Get the global WebSocket manager instance.

    Returns:
        WebSocketManager instance
    """
    return websocket_manager


# Convenience functions for broadcasting updates
async def broadcast_reservation_update(action: str, reservation_data: Dict[str, Any]):
    """Convenience function to broadcast reservation updates."""
    await websocket_manager.broadcast_reservation_update(action, reservation_data)


async def broadcast_conversation_update(conversation_data: Dict[str, Any]):
    """Convenience function to broadcast conversation updates."""
    await websocket_manager.broadcast_conversation_update(conversation_data)


async def broadcast_vacation_update(vacation_data: Dict[str, Any]):
    """Convenience function to broadcast vacation updates."""
    await websocket_manager.broadcast_vacation_update(vacation_data)


async def broadcast_customer_update(customer_data: Dict[str, Any]):
    """Convenience function to broadcast customer updates."""
    await websocket_manager.broadcast_customer_update(customer_data)
