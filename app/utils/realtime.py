import asyncio
import contextlib
import datetime
import json
import logging
from dataclasses import dataclass
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect
from prometheus_client import generate_latest

from app.config import config


def _utc_iso_now() -> str:
    dt = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    # Normalize to Z suffix for UTC
    return dt.isoformat().replace("+00:00", "Z")


@dataclass
class ClientConnection:
    websocket: WebSocket
    update_types: set[str] | None = None
    entity_ids: set[str] | None = None
    tab_id: str | None = None
    client_host: str = "unknown"

    async def send_json(self, payload: dict[str, Any]) -> None:
        await self.websocket.send_text(json.dumps(payload, ensure_ascii=False))

    def accepts(self, event_type: str, affected_entities: list[str] | None) -> bool:
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
        self._clients: dict[int, ClientConnection] = {}
        # Map tab id -> ClientConnection (enforce single connection per browser tab)
        self._clients_by_tab: dict[str, ClientConnection] = {}
        self._lock = asyncio.Lock()
        self._metrics_task: asyncio.Task | None = None
        # Recent reservation events to suppress contradictory duplicates
        # key -> {"type": str, "ts": datetime.datetime}
        self._recent_reservation_events: dict[str, dict[str, Any]] = {}
        # Main event loop captured on FastAPI startup for cross-thread scheduling
        self._main_loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket) -> ClientConnection:
        client_host = websocket.client.host if websocket.client else "unknown"
        tab_id = None
        try:
            tab_id = websocket.query_params.get("tab")  # type: ignore[attr-defined]
        except Exception:
            tab_id = None
        logging.info(f"🔗 WebSocket connection attempt from {client_host}")
        await websocket.accept()
        conn = ClientConnection(websocket=websocket, tab_id=tab_id, client_host=client_host)
        async with self._lock:
            # Enforce single connection per tab id: drop the previous one if exists
            if isinstance(tab_id, str) and tab_id:
                existing = self._clients_by_tab.get(tab_id)
                if existing and existing.websocket is not websocket:
                    try:
                        logging.info(f"♻️ Replacing existing connection for tab={tab_id} from {existing.client_host}")
                        await existing.websocket.close(code=1000)
                    except Exception:
                        pass
                    # Remove the old from registries
                    self._clients.pop(id(existing.websocket), None)
                    self._clients_by_tab.pop(tab_id, None)
                # Register the new one for this tab id
                self._clients_by_tab[tab_id] = conn
            # Always register in clients map
            self._clients[id(websocket)] = conn
        logging.info(f"✅ WebSocket client connected from {client_host}. Total=%d", len(self._clients))
        return conn

    async def disconnect(self, conn: ClientConnection) -> None:
        client_host = conn.websocket.client.host if conn.websocket.client else "unknown"
        async with self._lock:
            self._clients.pop(id(conn.websocket), None)
            try:
                if conn.tab_id and self._clients_by_tab.get(conn.tab_id) is conn:
                    self._clients_by_tab.pop(conn.tab_id, None)
            except Exception:
                pass
        logging.info(f"❌ WebSocket client from {client_host} disconnected. Total=%d", len(self._clients))

    async def broadcast(
        self,
        event_type: str,
        data: dict[str, Any],
        affected_entities: list[str] | None = None,
    ) -> None:
        # Optional: suppress contradictory duplicate reservation events within a short window
        try:
            reservation_event_types = {
                "reservation_created",
                "reservation_updated",
                "reservation_reinstated",
                "reservation_cancelled",
            }
            if event_type in reservation_event_types:
                # Build a reservation key: prefer id, else composite of wa_id/date/time_slot
                res_id = data.get("id")
                if res_id is not None:
                    key = f"id:{res_id}"
                else:
                    key = f"wa:{data.get('wa_id')}|d:{data.get('date')}|t:{data.get('time_slot')}"

                # Event priority: higher wins and can replace; lower/equal within window is suppressed
                priority = {
                    "reservation_created": 3,
                    "reservation_reinstated": 3,
                    "reservation_updated": 2,
                    "reservation_cancelled": 1,
                }
                now_ts = datetime.datetime.now(datetime.timezone.utc)

                # Purge old entries (older than 2 seconds)
                try:
                    to_delete = []
                    for k, v in self._recent_reservation_events.items():
                        ts: datetime.datetime = v.get("ts")  # type: ignore
                        if not isinstance(ts, datetime.datetime):
                            to_delete.append(k)
                            continue
                        if (now_ts - ts).total_seconds() > 2.0:
                            to_delete.append(k)
                    for k in to_delete:
                        self._recent_reservation_events.pop(k, None)
                except Exception:
                    pass

                existing = self._recent_reservation_events.get(key)
                if existing:
                    existing_type = existing.get("type")
                    existing_ts: datetime.datetime = existing.get("ts")  # type: ignore
                    if isinstance(existing_ts, datetime.datetime):
                        age_sec = (now_ts - existing_ts).total_seconds()
                    else:
                        age_sec = 0.0

                    if age_sec <= 1.0:
                        # Within suppression window
                        if priority.get(event_type, 0) <= priority.get(str(existing_type), 0):
                            logging.debug(
                                f"🚫 Suppressing {event_type} due to recent {existing_type} for key {key} ({age_sec:.3f}s)"
                            )
                            return
                        # Replace existing with higher priority
                        self._recent_reservation_events[key] = {"type": event_type, "ts": now_ts}
                    else:
                        # Window expired, overwrite
                        self._recent_reservation_events[key] = {"type": event_type, "ts": now_ts}
                else:
                    self._recent_reservation_events[key] = {"type": event_type, "ts": now_ts}
        except Exception as e:
            logging.debug(f"reservation dedupe check failed: {e}")
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

        logging.debug(f"📢 Broadcasting {event_type} to {len(targets)} clients: {data}")

        to_drop: list[ClientConnection] = []
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

        logging.debug(f"📤 Sent {event_type} to {sent_count}/{len(targets)} clients")

        # Persist qualifying notification events and prune to last 2000
        try:
            # Only persist types that are shown in notifications panel
            notif_types = {
                "reservation_created",
                "reservation_updated",
                "reservation_reinstated",
                "reservation_cancelled",
                "conversation_new_message",
                "vacation_period_updated",
            }
            if event_type in notif_types:
                import json as _json

                from app.db import NotificationEventModel, get_session

                # Use payload timestamp for consistency
                ts_iso = payload.get("timestamp") or _utc_iso_now()
                with get_session() as session:
                    session.add(
                        NotificationEventModel(
                            event_type=event_type,
                            ts_iso=str(ts_iso),
                            data=_json.dumps(data, ensure_ascii=False),
                        )
                    )
                    session.commit()
                    # Prune to last 2000 rows by created_at DESC
                    try:
                        # SQLite compatible pruning using subquery by id ordering
                        # Keep the latest 2000 ids and delete the rest
                        keep_ids = [
                            r[0]
                            for r in session.execute(
                                "SELECT id FROM notification_events ORDER BY id DESC LIMIT 2000"
                            ).all()
                        ]
                        if keep_ids:
                            session.execute(
                                "DELETE FROM notification_events WHERE id NOT IN ({})".format(
                                    ",".join(str(i) for i in keep_ids)
                                )
                            )
                            session.commit()
                    except Exception:
                        pass
        except Exception as e:
            logging.debug(f"notification persist failed: {e}")

        # Clean up failed connections
        if to_drop:
            async with self._lock:
                for c in to_drop:
                    self._clients.pop(id(c.websocket), None)
                    try:
                        if c.tab_id and self._clients_by_tab.get(c.tab_id) is c:
                            self._clients_by_tab.pop(c.tab_id, None)
                    except Exception:
                        pass

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
            # Capture the running loop for use from sync/non-loop threads
            try:
                self._main_loop = asyncio.get_running_loop()
            except Exception:
                self._main_loop = None

        async def _shutdown() -> None:
            if self._metrics_task and not self._metrics_task.done():
                self._metrics_task.cancel()
                with contextlib.suppress(Exception):
                    await self._metrics_task

        app.add_event_handler("startup", _startup)
        app.add_event_handler("shutdown", _shutdown)


def _parse_prometheus_text(text: str) -> dict[str, float]:
    values: dict[str, float] = {}
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
    client_host = websocket.client.host if websocket.client else "unknown"
    logging.info(f"🚀 WebSocket endpoint called from {client_host}")
    conn = await manager.connect(websocket)
    try:
        logging.info(f"📡 WebSocket {client_host} entering message loop")
        while True:
            msg = await websocket.receive_text()
            logging.debug(f"📨 WebSocket {client_host} received: {msg}")
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
                # WebSocket snapshot only includes vacations and metrics
                # Reservations and conversations are loaded on-demand via TanStack Query
                # Components query only what they need when they need it
                # Real-time updates come through WebSocket events which invalidate TanStack Query cache
                try:
                    vacations = _compute_vacations()
                except Exception:
                    vacations = []
                try:
                    metrics = _parse_prometheus_text(generate_latest().decode("utf-8"))
                except Exception:
                    metrics = {}
                await conn.send_json(
                    {
                        "type": "snapshot",
                        "timestamp": _utc_iso_now(),
                        "data": {
                            "vacations": vacations,
                            "metrics": metrics,
                        },
                    }
                )
            elif msg_type in ("get_customer_document", "get_document", "get_customer_doc"):
                try:
                    wa = (payload.get("data") or {}).get("wa_id") or payload.get("wa_id") or payload.get("waId")
                    wa = str(wa or "")
                    if not wa:
                        await conn.send_json({"type": "ignored", "timestamp": _utc_iso_now()})
                        continue
                    try:
                        from app.db import CustomerModel, get_session

                        with get_session() as session:
                            row = session.get(CustomerModel, wa)
                            doc = getattr(row, "document", None) if row else None
                    except Exception as e:
                        logging.error(f"WS get_customer_document error: {e}")
                        doc = None
                    await conn.send_json(
                        {
                            "type": "customer_document_updated",
                            "timestamp": _utc_iso_now(),
                            "data": {"wa_id": wa, "document": doc},
                        }
                    )
                except Exception as e:
                    logging.error(f"WS get_customer_document exception: {e}")
                    await conn.send_json({"type": "ignored", "timestamp": _utc_iso_now()})
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
                        await conn.send_json(
                            {
                                "type": "modify_reservation_nack",
                                "timestamp": _utc_iso_now(),
                                "data": {"message": error_msg},
                            }
                        )
                        continue

                    # Import and call the modify function
                    from app.services.assistant_functions import modify_reservation

                    logging.info(
                        f"🔄 WebSocket modify_reservation called with: wa_id={wa_id}, date={new_date}, time={new_time_slot}, reservation_id={reservation_id}, ar={ar}"
                    )

                    result = modify_reservation(
                        wa_id=wa_id,
                        new_date=new_date,
                        new_time_slot=new_time_slot,
                        new_name=customer_name,
                        new_type=reservation_type,
                        approximate=approximate,
                        ar=ar,  # Pass Arabic flag to get translated error messages
                        reservation_id_to_modify=reservation_id,
                        _call_source="frontend",  # Tag as frontend-initiated
                    )

                    logging.info(f"📥 modify_reservation result: {result}")

                    if result.get("success"):
                        logging.info("✅ Sending modify_reservation_ack")
                        await conn.send_json(
                            {
                                "type": "modify_reservation_ack",
                                "timestamp": _utc_iso_now(),
                                "data": result.get("data", {}),
                            }
                        )
                    else:
                        logging.info(
                            f"❌ Sending modify_reservation_nack: {result.get('message', 'Modification failed')}"
                        )
                        await conn.send_json(
                            {
                                "type": "modify_reservation_nack",
                                "timestamp": _utc_iso_now(),
                                "data": {"message": result.get("message", "Modification failed")},
                            }
                        )

                except Exception as e:
                    logging.error(f"Modify reservation websocket error: {e}")
                    await conn.send_json(
                        {
                            "type": "modify_reservation_nack",
                            "timestamp": _utc_iso_now(),
                            "data": {"message": "Server error during modification"},
                        }
                    )

            elif msg_type == "cancel_reservation":
                # Handle reservation cancellation via websocket
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    date_str = data.get("date")
                    reservation_id = data.get("reservation_id")

                    if not wa_id:
                        await conn.send_json(
                            {
                                "type": "cancel_reservation_nack",
                                "timestamp": _utc_iso_now(),
                                "error": "Missing required field: wa_id",
                            }
                        )
                        continue

                    # Import and call the cancel function
                    from app.services.assistant_functions import cancel_reservation

                    result = cancel_reservation(
                        wa_id=wa_id, date_str=date_str, reservation_id_to_cancel=reservation_id, _call_source="frontend"
                    )

                    if result.get("success"):
                        await conn.send_json(
                            {
                                "type": "cancel_reservation_ack",
                                "timestamp": _utc_iso_now(),
                                "data": result.get("data", {}),
                            }
                        )
                    else:
                        await conn.send_json(
                            {
                                "type": "cancel_reservation_nack",
                                "timestamp": _utc_iso_now(),
                                "error": result.get("message", "Cancellation failed"),
                            }
                        )

                except Exception as e:
                    logging.error(f"Cancel reservation websocket error: {e}")
                    await conn.send_json(
                        {
                            "type": "cancel_reservation_nack",
                            "timestamp": _utc_iso_now(),
                            "error": "Server error during cancellation",
                        }
                    )

            elif msg_type == "conversation_send_message":
                # Handle sending messages via websocket
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    message = data.get("message")

                    if not wa_id or not message:
                        await conn.send_json(
                            {
                                "type": "send_message_nack",
                                "timestamp": _utc_iso_now(),
                                "error": "Missing required fields: wa_id, message",
                            }
                        )
                        continue

                    # Enforce WhatsApp message size limit at WS ingress as well
                    try:
                        if not isinstance(message, str):
                            await conn.send_json(
                                {
                                    "type": "send_message_nack",
                                    "timestamp": _utc_iso_now(),
                                    "error": "Invalid message payload",
                                }
                            )
                            continue
                        if len(message) > 4096:
                            await conn.send_json(
                                {
                                    "type": "send_message_nack",
                                    "timestamp": _utc_iso_now(),
                                    "error": "Message too long (max 4096)",
                                }
                            )
                            continue
                    except Exception:
                        await conn.send_json(
                            {
                                "type": "send_message_nack",
                                "timestamp": _utc_iso_now(),
                                "error": "Invalid message payload",
                            }
                        )
                        continue

                    # Import and call the message sending function (await the async call)
                    from app.utils.whatsapp_utils import send_whatsapp_message

                    resp = await send_whatsapp_message(wa_id, message)

                    # Determine success based on response type/status
                    ok = False
                    try:
                        if isinstance(resp, tuple) or resp is None:
                            ok = False
                        else:
                            status = getattr(resp, "status_code", 500)
                            ok = int(status) < 400
                    except Exception:
                        ok = False

                    if ok:
                        # Persist to DB (no broadcast here)
                        try:
                            from app.utils.service_utils import append_message

                            now_local = datetime.datetime.now(ZoneInfo(config["TIMEZONE"]))
                            date_str = now_local.strftime("%Y-%m-%d")
                            time_str = now_local.strftime("%H:%M")
                            append_message(wa_id, "secretary", message, date_str, time_str)
                        except Exception as persist_err:
                            logging.error(f"append_message failed after WS send: {persist_err}")

                        # Broadcast notification (only for messages sent via WhatsApp)
                        try:
                            enqueue_broadcast(
                                "conversation_new_message",
                                {
                                    "wa_id": wa_id,
                                    "role": "secretary",
                                    "message": message,
                                    "date": date_str,
                                    "time": time_str,
                                },
                                affected_entities=[wa_id],
                                source="frontend",
                            )
                        except Exception as broadcast_err:
                            logging.error(f"Broadcast failed after WS send: {broadcast_err}")

                        await conn.send_json(
                            {
                                "type": "send_message_ack",
                                "timestamp": _utc_iso_now(),
                            }
                        )
                    else:
                        await conn.send_json(
                            {
                                "type": "send_message_nack",
                                "timestamp": _utc_iso_now(),
                                "error": "Failed to send message",
                            }
                        )

                except Exception as e:
                    logging.error(f"Send message websocket error: {e}")
                    await conn.send_json(
                        {
                            "type": "send_message_nack",
                            "timestamp": _utc_iso_now(),
                            "error": "Server error during message sending",
                        }
                    )

            elif msg_type == "secretary_typing":
                # Secretary typing indicator: forward to WhatsApp and broadcast UI typing state
                try:
                    data = payload.get("data") or {}
                    wa_id = data.get("wa_id")
                    typing_flag = bool(data.get("typing"))

                    if not wa_id:
                        await conn.send_json(
                            {
                                "type": "typing_nack",
                                "timestamp": _utc_iso_now(),
                                "error": "Missing required field: wa_id",
                            }
                        )
                        continue

                    # Broadcast typing state to UI first for responsiveness
                    with contextlib.suppress(Exception):
                        await manager.broadcast(
                            "conversation_typing",
                            {"wa_id": wa_id, "state": ("start" if typing_flag else "stop")},
                            [wa_id],
                        )

                    # Only send WhatsApp typing when typing starts to reduce calls
                    if typing_flag:
                        try:
                            from app.utils.whatsapp_utils import send_typing_indicator_for_wa

                            resp = await send_typing_indicator_for_wa(wa_id)
                            try:
                                if isinstance(resp, tuple):
                                    logging.debug(f"typing indicator result: {resp}")
                            except Exception:
                                pass
                        except Exception as e:
                            logging.debug(f"typing indicator exception: {e}")

                    await conn.send_json(
                        {
                            "type": "typing_ack",
                            "timestamp": _utc_iso_now(),
                        }
                    )
                except Exception as e:
                    logging.error(f"Secretary typing websocket error: {e}")
                    await conn.send_json(
                        {
                            "type": "typing_nack",
                            "timestamp": _utc_iso_now(),
                            "error": "Server error during typing",
                        }
                    )

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
                                s_dt = (
                                    datetime.datetime.fromisoformat(str(s_raw))
                                    if "T" in str(s_raw)
                                    else datetime.datetime.strptime(str(s_raw), "%Y-%m-%d")
                                )
                                e_dt = (
                                    datetime.datetime.fromisoformat(str(e_raw))
                                    if "T" in str(e_raw)
                                    else datetime.datetime.strptime(str(e_raw), "%Y-%m-%d")
                                )
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
                        from app.db import VacationPeriodModel, get_session

                        with get_session() as session:
                            session.query(VacationPeriodModel).delete(synchronize_session=False)
                            for s_date, e_date, title in pairs:
                                session.add(VacationPeriodModel(start_date=s_date, end_date=e_date, title=title))
                            session.commit()
                    except Exception as e:
                        logging.error(f"DB persist failed: {e}")
                        await conn.send_json(
                            {
                                "type": "vacation_update_nack",
                                "timestamp": _utc_iso_now(),
                                "error": f"db_persist_failed: {str(e)}",
                            }
                        )
                        continue

                    # Broadcast updated vacations (always frontend-initiated)
                    try:
                        updated = _compute_vacations()
                    except Exception:
                        updated = []
                    await conn.send_json({"type": "vacation_update_ack", "timestamp": _utc_iso_now()})
                    await broadcast("vacation_period_updated", {"periods": updated}, source="frontend")
                except Exception as e:
                    logging.error(f"Vacation update exception: {e}")
                    await conn.send_json(
                        {"type": "vacation_update_nack", "timestamp": _utc_iso_now(), "error": "exception"}
                    )
            # No additional message types handled here
            else:
                # Unknown message types ignored
                await conn.send_json({"type": "ignored", "timestamp": _utc_iso_now()})
    except WebSocketDisconnect as e:
        logging.info(f"🔌 WebSocket {client_host} disconnect: {e}")
        await manager.disconnect(conn)
    except Exception as e:
        logging.error(f"💥 WebSocket {client_host} error: {e}")
        await manager.disconnect(conn)


async def broadcast(
    event_type: str, data: dict[str, Any], affected_entities: list[str] | None = None, source: str | None = None
) -> None:
    # Include source in data if provided to track event origin (assistant vs frontend)
    if source:
        data = {**data, "_source": source}
    await manager.broadcast(event_type, data, affected_entities)


def enqueue_broadcast(
    event_type: str, data: dict[str, Any], affected_entities: list[str] | None = None, source: str | None = None
) -> None:
    # Include source in data if provided to track event origin (assistant vs frontend)
    if source:
        data = {**data, "_source": source}

    # Prefer scheduling on the current running loop if present (i.e., inside ASGI handlers)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event_type, data, affected_entities))
        logging.debug(f"enqueue_broadcast scheduled on running loop: {event_type} (source={source})")
        return
    except RuntimeError:
        pass

    # If called from a non-async context/thread, schedule safely onto the captured main loop
    try:
        main_loop = manager._main_loop
        if main_loop is not None and not main_loop.is_closed():
            try:
                import concurrent.futures as _cf  # local import to avoid overhead

                fut: _cf.Future = asyncio.run_coroutine_threadsafe(
                    manager.broadcast(event_type, data, affected_entities), main_loop
                )

                # Optionally attach a done callback for debugging failures without noisy logs
                def _silent_cb(_f: _cf.Future) -> None:
                    try:
                        _f.result()
                    except Exception as e:
                        logging.debug(f"enqueue_broadcast task raised: {e}")

                fut.add_done_callback(_silent_cb)
                logging.debug(f"enqueue_broadcast scheduled on main loop: {event_type} (source={source})")
                return
            except Exception as e:
                logging.warning(f"enqueue_broadcast thread-safe scheduling failed: {e}")
    except Exception:
        pass

    # Last resort: drop the event rather than blocking or spawning new loops
    logging.debug(f"enqueue_broadcast dropped (no event loop available): {event_type}")


def start_metrics_push_task(app: FastAPI) -> None:
    manager.start_metrics_task(app)


def _compute_vacations() -> list:
    """Build vacation periods from DB."""
    vacation_periods = []
    try:
        vacation_message = config.get("VACATION_MESSAGE", "The business is closed during this period.")
        try:
            from app.db import VacationPeriodModel, get_session

            with get_session() as session:
                rows = session.query(VacationPeriodModel).all()
                for r in rows:
                    try:
                        # Use start_date and end_date directly from DB
                        start_date = datetime.datetime.combine(r.start_date, datetime.time.min).replace(
                            tzinfo=ZoneInfo(config["TIMEZONE"])
                        )
                        end_date = datetime.datetime.combine(r.end_date, datetime.time.max).replace(
                            tzinfo=ZoneInfo(config["TIMEZONE"])
                        )
                        vacation_periods.append(
                            {
                                "start": start_date.isoformat(),
                                "end": end_date.isoformat(),
                                "title": str(r.title) if r.title else vacation_message,
                            }
                        )
                    except Exception:
                        continue
        except Exception:
            pass
    except Exception:
        return []
    return vacation_periods
