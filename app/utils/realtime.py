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

        logging.info(f"📢 Broadcasting {event_type} to {len(targets)} clients: {data}")

        to_drop: List[ClientConnection] = []
        sent_count = 0
        for conn in targets:
            try:
                if conn.accepts(event_type, affected_entities):
                    await conn.send_json(payload)
                    sent_count += 1
                else:
                    logging.debug(f"🚫 Client filtered out event {event_type}")
            except Exception as e:
                # Collect for removal
                logging.warning(f"❌ WebSocket send failed: {e}. Scheduling disconnect.")
                to_drop.append(conn)

        logging.info(f"📤 Sent {event_type} to {sent_count}/{len(targets)} clients")

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
            elif msg_type == "modify_reservation":
                # Handle reservation modification via websocket
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    new_date = data.get("date")
                    new_time_slot = data.get("time_slot")
                    customer_name = data.get("customer_name")
                    reservation_type = data.get("type")
                    approximate = data.get("approximate", False)
                    reservation_id = data.get("reservation_id")
                    ar = data.get("ar", False)  # Extract Arabic/RTL flag
                    
                    if not wa_id or not new_date or not new_time_slot:
                        # Use Arabic error message if requested
                        error_msg = "Missing required fields: wa_id, date, time_slot"
                        if ar:
                            error_msg = "حقول مطلوبة مفقودة: wa_id, date, time_slot"
                        await conn.send_json({
                            "type": "modify_reservation_nack", 
                            "timestamp": _utc_iso_now(),
                            "data": {"message": error_msg}
                        })
                        continue
                    
                    # Import and call the modify function
                    from app.services.assistant_functions import modify_reservation
                    logging.info(f"🔄 WebSocket modify_reservation called with: wa_id={wa_id}, date={new_date}, time={new_time_slot}, reservation_id={reservation_id}, ar={ar}")
                    
                    result = modify_reservation(
                        wa_id=wa_id,
                        new_date=new_date,
                        new_time_slot=new_time_slot,
                        new_name=customer_name,
                        new_type=reservation_type,
                        approximate=approximate,
                        ar=ar,  # Pass Arabic flag to get translated error messages
                        reservation_id_to_modify=reservation_id
                    )
                    
                    logging.info(f"📥 modify_reservation result: {result}")
                    
                    if result.get("success"):
                        logging.info(f"✅ Sending modify_reservation_ack")
                        await conn.send_json({
                            "type": "modify_reservation_ack", 
                            "timestamp": _utc_iso_now(),
                            "data": result.get("data", {})
                        })
                    else:
                        logging.info(f"❌ Sending modify_reservation_nack: {result.get('message', 'Modification failed')}")
                        await conn.send_json({
                            "type": "modify_reservation_nack", 
                            "timestamp": _utc_iso_now(),
                            "data": {"message": result.get("message", "Modification failed")}
                        })
                        
                except Exception as e:
                    logging.error(f"Modify reservation websocket error: {e}")
                    await conn.send_json({
                        "type": "modify_reservation_nack", 
                        "timestamp": _utc_iso_now(),
                        "data": {"message": "Server error during modification"}
                    })
                    
            elif msg_type == "cancel_reservation":
                # Handle reservation cancellation via websocket
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    date_str = data.get("date")
                    reservation_id = data.get("reservation_id")
                    
                    if not wa_id:
                        await conn.send_json({
                            "type": "cancel_reservation_nack", 
                            "timestamp": _utc_iso_now(),
                            "error": "Missing required field: wa_id"
                        })
                        continue
                    
                    # Import and call the cancel function
                    from app.services.assistant_functions import cancel_reservation
                    result = cancel_reservation(
                        wa_id=wa_id,
                        date_str=date_str,
                        reservation_id_to_cancel=reservation_id
                    )
                    
                    if result.get("success"):
                        await conn.send_json({
                            "type": "cancel_reservation_ack", 
                            "timestamp": _utc_iso_now(),
                            "data": result.get("data", {})
                        })
                    else:
                        await conn.send_json({
                            "type": "cancel_reservation_nack", 
                            "timestamp": _utc_iso_now(),
                            "error": result.get("message", "Cancellation failed")
                        })
                        
                except Exception as e:
                    logging.error(f"Cancel reservation websocket error: {e}")
                    await conn.send_json({
                        "type": "cancel_reservation_nack", 
                        "timestamp": _utc_iso_now(),
                        "error": "Server error during cancellation"
                    })
                    
            elif msg_type == "conversation_send_message":
                # Handle sending messages via websocket
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    message = data.get("message")
                    
                    if not wa_id or not message:
                        await conn.send_json({
                            "type": "send_message_nack", 
                            "timestamp": _utc_iso_now(),
                            "error": "Missing required fields: wa_id, message"
                        })
                        continue
                    
                    # Import and call the message sending function
                    from app.utils.whatsapp_utils import send_whatsapp_message
                    success = send_whatsapp_message(wa_id, message)
                    
                    if success:
                        await conn.send_json({
                            "type": "send_message_ack", 
                            "timestamp": _utc_iso_now()
                        })
                        # Broadcast the new message event
                        await manager.broadcast("conversation_new_message", {
                            "wa_id": wa_id,
                            "message": message,
                            "role": "admin",
                            "date": _utc_iso_now()[:10],  # YYYY-MM-DD
                            "time": _utc_iso_now()[11:16]  # HH:MM
                        }, affected_entities=[wa_id])
                    else:
                        await conn.send_json({
                            "type": "send_message_nack", 
                            "timestamp": _utc_iso_now(),
                            "error": "Failed to send message"
                        })
                        
                except Exception as e:
                    logging.error(f"Send message websocket error: {e}")
                    await conn.send_json({
                        "type": "send_message_nack", 
                        "timestamp": _utc_iso_now(),
                        "error": "Server error during message sending"
                    })
                    
            elif msg_type == "vacation_update":
                # Accept websocket writes to update vacation periods and persist to DB (+config)
                try:
                    payload_data = payload.get("data") or {}
                    periods = payload_data.get("periods")

                    # Normalize incoming into start/end pairs
                    pairs: list[tuple[datetime.date, datetime.date, str | None]] = []
                    if isinstance(periods, list) and periods:
                        for p in periods:
                            try:
                                s_raw = p.get("start")
                                e_raw = p.get("end")
                                title = p.get("title")
                                if not s_raw or not e_raw:
                                    continue
                                s_dt = datetime.datetime.fromisoformat(str(s_raw)) if "T" in str(s_raw) else datetime.datetime.strptime(str(s_raw), "%Y-%m-%d")
                                e_dt = datetime.datetime.fromisoformat(str(e_raw)) if "T" in str(e_raw) else datetime.datetime.strptime(str(e_raw), "%Y-%m-%d")
                                s_date = datetime.date(s_dt.year, s_dt.month, s_dt.day)
                                e_date = datetime.date(e_dt.year, e_dt.month, e_dt.day)
                                if e_date < s_date:
                                    s_date, e_date = e_date, s_date
                                pairs.append((s_date, e_date, title if isinstance(title, str) else None))
                            except Exception as e:
                                logging.error(f"Error processing vacation period: {e}")
                                continue

                    # Persist (always update DB, even if pairs is empty to clear all periods)
                    try:
                        from app.db import get_session, VacationPeriodModel
                        with get_session() as session:
                            session.query(VacationPeriodModel).delete(synchronize_session=False)
                            for s_date, e_date, title in pairs:
                                session.add(VacationPeriodModel(start_date=s_date, end_date=e_date, title=title))
                            session.commit()
                    except Exception as e:
                        logging.error(f"DB persist failed: {e}")
                        await conn.send_json({"type": "vacation_update_nack", "timestamp": _utc_iso_now(), "error": f"db_persist_failed: {str(e)}"})
                        continue

                    # Broadcast updated vacations
                    try:
                        updated = _compute_vacations()
                    except Exception:
                        updated = []
                    await conn.send_json({"type": "vacation_update_ack", "timestamp": _utc_iso_now()})
                    await manager.broadcast("vacation_period_updated", {"periods": updated})
                except Exception as e:
                    logging.error(f"Vacation update exception: {e}")
                    await conn.send_json({"type": "vacation_update_nack", "timestamp": _utc_iso_now(), "error": "exception"})
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
        logging.info(f"📡 enqueue_broadcast called: type={event_type}, data={data}, affected_entities={affected_entities}")
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event_type, data, affected_entities))
        logging.info(f"✅ broadcast task created successfully")
    except RuntimeError:
        # No running loop; best-effort fire-and-forget using new loop in thread
        logging.info(f"⚠️ No running loop, using asyncio.run fallback")
        try:
            asyncio.run(manager.broadcast(event_type, data, affected_entities))
            logging.info(f"✅ fallback broadcast completed")
        except Exception as e:
            logging.error(f"❌ enqueue_broadcast failed without running loop: {e}")


def start_metrics_push_task(app: FastAPI) -> None:
    manager.start_metrics_task(app)


def _compute_vacations() -> list:
    """Build vacation periods from DB."""
    vacation_periods = []
    try:
        vacation_message = config.get("VACATION_MESSAGE", "The business is closed during this period.")
        try:
            from app.db import get_session, VacationPeriodModel
            with get_session() as session:
                rows = session.query(VacationPeriodModel).all()
                for r in rows:
                    try:
                        # Use start_date and end_date directly from DB
                        start_date = datetime.datetime.combine(r.start_date, datetime.time.min).replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                        end_date = datetime.datetime.combine(r.end_date, datetime.time.max).replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                        vacation_periods.append({
                            "start": start_date.isoformat(),
                            "end": end_date.isoformat(),
                            "title": str(r.title) if r.title else vacation_message,
                        })
                    except Exception:
                        continue
        except Exception:
            pass
    except Exception:
        return []
    return vacation_periods


