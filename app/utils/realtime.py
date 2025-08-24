import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi import FastAPI
from prometheus_client import generate_latest
from app.config import config
import datetime
from zoneinfo import ZoneInfo


def _utc_iso_now() -> str:
    dt = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    # Normalize to Z suffix for UTC
    return dt.isoformat().replace("+00:00", "Z")


@dataclass
class ClientConnection:
    websocket: WebSocket
    update_types: Optional[Set[str]] = None
    entity_ids: Optional[Set[str]] = None

    async def send_json(self, payload: Dict[str, Any]) -> None:
        await self.websocket.send_text(json.dumps(payload, ensure_ascii=False))

    def accepts(self, event_type: str, affected_entities: Optional[List[str]]) -> bool:
        # Filter by update types if provided
        if self.update_types and event_type not in self.update_types:
            return False
        # Filter by entity ids if provided
        if self.entity_ids and affected_entities:
            return any(e in self.entity_ids for e in affected_entities)
        return True


class RealtimeManager:
    def __init__(self) -> None:
        # Map websocket id -> ClientConnection
        self._clients: Dict[int, ClientConnection] = {}
        self._lock = asyncio.Lock()
        self._metrics_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket) -> ClientConnection:
        await websocket.accept()
        conn = ClientConnection(websocket=websocket)
        async with self._lock:
            self._clients[id(websocket)] = conn
        logging.info("WebSocket client connected. Total=%d", len(self._clients))
        return conn

    async def disconnect(self, conn: ClientConnection) -> None:
        async with self._lock:
            self._clients.pop(id(conn.websocket), None)
        logging.info("WebSocket client disconnected. Total=%d", len(self._clients))

    async def broadcast(
        self,
        event_type: str,
        data: Dict[str, Any],
        affected_entities: Optional[List[str]] = None,
    ) -> None:
        payload = {
            "type": event_type,
            "timestamp": _utc_iso_now(),
            "data": data,
        }
        if affected_entities:
            payload["affected_entities"] = affected_entities

        # Copy clients under lock, then send outside the lock
        async with self._lock:
            targets = list(self._clients.values())

        to_drop: List[ClientConnection] = []
        for conn in targets:
            try:
                if conn.accepts(event_type, affected_entities):
                    await conn.send_json(payload)
            except Exception:
                # Collect for removal
                logging.warning("WebSocket send failed. Scheduling disconnect.")
                to_drop.append(conn)

        # Clean up failed connections
        if to_drop:
            async with self._lock:
                for c in to_drop:
                    self._clients.pop(id(c.websocket), None)

    def start_metrics_task(self, app: FastAPI) -> None:
        if self._metrics_task and not self._metrics_task.done():
            return

        async def _run() -> None:
            # Periodically push Prometheus metrics snapshot to clients
            while True:
                try:
                    values = _parse_prometheus_text(generate_latest().decode("utf-8"))
                    await self.broadcast("metrics_updated", {"metrics": values})
                except Exception as e:
                    logging.debug(f"metrics push failed: {e}")
                await asyncio.sleep(5)

        # Ensure the task is tied to app lifespan
        async def _startup() -> None:
            if not self._metrics_task or self._metrics_task.done():
                self._metrics_task = asyncio.create_task(_run())

        async def _shutdown() -> None:
            if self._metrics_task and not self._metrics_task.done():
                self._metrics_task.cancel()
                try:
                    await self._metrics_task
                except Exception:
                    pass

        app.add_event_handler("startup", _startup)
        app.add_event_handler("shutdown", _shutdown)


def _parse_prometheus_text(text: str) -> Dict[str, float]:
    values: Dict[str, float] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        try:
            parts = line.split()
            if len(parts) < 2:
                continue
            key = parts[0]
            val = float(parts[-1])
            # Remove label set from key e.g., metric{name="x"} -> metric
            if "{" in key:
                key = key.split("{")[0]
            values[key] = val
        except Exception:
            continue
    return values


manager = RealtimeManager()


websocket_router = APIRouter()


@websocket_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    conn = await manager.connect(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            try:
                payload = json.loads(msg)
            except Exception:
                payload = {"type": "unknown"}

            msg_type = payload.get("type")
            if msg_type == "set_filter":
                filt = payload.get("filters") or {}
                update_types = filt.get("updateTypes") or filt.get("update_types")
                entity_ids = filt.get("entityIds") or filt.get("entity_ids")
                conn.update_types = set(update_types) if update_types else None
                conn.entity_ids = set(entity_ids) if entity_ids else None
                await conn.send_json({"type": "filter_ack", "timestamp": _utc_iso_now()})
            elif msg_type == "ping":
                await conn.send_json({"type": "pong", "timestamp": _utc_iso_now()})
            elif msg_type == "get_snapshot":
                # Optional: parse range, but service functions already time-scope reasonably
                try:
                    from app.utils.service_utils import get_all_reservations  # lazy import to avoid circular
                    reservations_resp = get_all_reservations(future=False, include_cancelled=True)
                    reservations = reservations_resp.get("data", {}) if isinstance(reservations_resp, dict) else {}
                except Exception:
                    reservations = {}
                try:
                    from app.utils.service_utils import get_all_conversations  # lazy import to avoid circular
                    conversations_resp = get_all_conversations()
                    conversations = conversations_resp.get("data", {}) if isinstance(conversations_resp, dict) else {}
                except Exception:
                    conversations = {}
                try:
                    vacations = _compute_vacations()
                except Exception:
                    vacations = []
                try:
                    metrics = _parse_prometheus_text(generate_latest().decode("utf-8"))
                except Exception:
                    metrics = {}
                await conn.send_json({
                    "type": "snapshot",
                    "timestamp": _utc_iso_now(),
                    "data": {
                        "reservations": reservations,
                        "conversations": conversations,
                        "vacations": vacations,
                        "metrics": metrics,
                    },
                })
            else:
                # Unknown message types ignored
                await conn.send_json({"type": "ignored", "timestamp": _utc_iso_now()})
    except WebSocketDisconnect:
        await manager.disconnect(conn)
    except Exception:
        await manager.disconnect(conn)


async def broadcast(event_type: str, data: Dict[str, Any], affected_entities: Optional[List[str]] = None) -> None:
    await manager.broadcast(event_type, data, affected_entities)


def enqueue_broadcast(event_type: str, data: Dict[str, Any], affected_entities: Optional[List[str]] = None) -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event_type, data, affected_entities))
    except RuntimeError:
        # No running loop; best-effort fire-and-forget using new loop in thread
        try:
            asyncio.run(manager.broadcast(event_type, data, affected_entities))
        except Exception:
            logging.debug("enqueue_broadcast failed without running loop")


def start_metrics_push_task(app: FastAPI) -> None:
    manager.start_metrics_task(app)


def _compute_vacations() -> list:
    """Build vacation periods from config similar to HTTP API implementation."""
    vacation_periods = []
    try:
        vacation_start_dates = config.get("VACATION_START_DATES", "")
        vacation_durations = config.get("VACATION_DURATIONS", "")
        vacation_message = config.get("VACATION_MESSAGE", "The business is closed during this period.")
        if vacation_start_dates and vacation_durations and isinstance(vacation_start_dates, str) and isinstance(vacation_durations, str):
            start_dates = [d.strip() for d in vacation_start_dates.split(',') if d.strip()]
            durations = [int(d.strip()) for d in vacation_durations.split(',') if d.strip()]
            if len(start_dates) == len(durations):
                for start_date_str, duration in zip(start_dates, durations):
                    try:
                        start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                        end_date = start_date + datetime.timedelta(days=duration-1)
                        vacation_periods.append({
                            "start": start_date.isoformat(),
                            "end": end_date.isoformat(),
                            "title": vacation_message,
                            "duration": duration,
                        })
                    except Exception:
                        continue
    except Exception:
        return []
    return vacation_periods


