import asyncio
import datetime
import json
import logging
from collections.abc import Awaitable
from typing import TYPE_CHECKING, Protocol, cast

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    pass

from app.db import InboundMessageQueueModel, get_session
from app.metrics import (
    INBOUND_QUEUE_CLAIM_FAILURES,
    INBOUND_QUEUE_CLAIMED,
    INBOUND_QUEUE_ENQUEUE_DUPLICATE,
    INBOUND_QUEUE_ENQUEUED,
    INBOUND_QUEUE_LENGTH,
    INBOUND_QUEUE_OLDEST_AGE_SECONDS,
    INBOUND_QUEUE_PROCESSED,
    INBOUND_QUEUE_PROCESSING_ERRORS,
)
from app.services.llm_service import get_llm_service
from app.utils.whatsapp_utils import process_whatsapp_message


class _LLMRunner(Protocol):
    def run(self, wa_id: str) -> Awaitable[tuple[str | None, str, str]]: ...


QUEUE_POLL_INTERVAL_SECONDS = 0.5  # tight loop with sleep; very low memory footprint
MAX_CLAIM_BATCH = 1  # claim strictly one item per worker iteration to keep memory low
CLAIM_STALE_AFTER_SECONDS = 300  # re-claim abandoned items after 5 minutes
MAX_PROCESSING_ATTEMPTS = 3


def enqueue_inbound(
    payload: dict[str, object], message_id: str | None, wa_id: str | None
) -> tuple[bool, int | None]:
    """
    Persist inbound webhook payload into the DB-backed queue.
    Returns (created, id) where created indicates new insert (False if duplicate by message_id).
    """
    try:
        payload_text = json.dumps(payload, ensure_ascii=False)
    except Exception:
        payload_text = str(payload)

    with get_session() as session:
        # De-duplicate by message_id when present
        if message_id:
            existing_id = (
                session.execute(
                    select(InboundMessageQueueModel.id).where(
                        InboundMessageQueueModel.message_id == message_id
                    )
                )
                .scalars()
                .first()
            )
            if existing_id is not None:
                INBOUND_QUEUE_ENQUEUE_DUPLICATE.labels(source="webhook").inc()
                return False, existing_id

        row = InboundMessageQueueModel(
            message_id=message_id,
            wa_id=wa_id,
            payload=payload_text,
            status="pending",
            attempts=0,
        )
        session.add(row)
        session.commit()
        INBOUND_QUEUE_ENQUEUED.labels(source="webhook").inc()
        # Avoid strict typing on ORM identity; return None to keep API simple
        return True, None


def _update_queue_metrics(session: Session) -> None:
    try:
        pending_count = (
            session.execute(
                select(func.count(InboundMessageQueueModel.id)).where(
                    InboundMessageQueueModel.status == "pending"
                )
            )
            .scalars()
            .first()
        )
        INBOUND_QUEUE_LENGTH.set(int(pending_count or 0))

        oldest = (
            session.execute(
                select(InboundMessageQueueModel.created_at)
                .where(InboundMessageQueueModel.status == "pending")
                .order_by(InboundMessageQueueModel.created_at.asc())
                .limit(1)
            )
            .scalars()
            .first()
        )
        if oldest is not None:
            age = (
                datetime.datetime.utcnow() - oldest.replace(tzinfo=None)
            ).total_seconds()
            INBOUND_QUEUE_OLDEST_AGE_SECONDS.set(max(0, age))
        else:
            INBOUND_QUEUE_OLDEST_AGE_SECONDS.set(0)
    except Exception:
        # best-effort metrics
        pass


def _claim_one(session: Session) -> InboundMessageQueueModel | None:
    now = datetime.datetime.utcnow()
    stale_cutoff = now - datetime.timedelta(seconds=CLAIM_STALE_AFTER_SECONDS)

    # Try to claim a pending item
    row = session.execute(
        select(InboundMessageQueueModel)
        .where(InboundMessageQueueModel.status == "pending")
        .order_by(InboundMessageQueueModel.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    ).scalar_one_or_none()

    if row is None:
        # Try to re-claim stale processing items
        row = session.execute(
            select(InboundMessageQueueModel)
            .where(
                InboundMessageQueueModel.status == "processing",
                InboundMessageQueueModel.locked_at < stale_cutoff,
            )
            .order_by(InboundMessageQueueModel.locked_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        ).scalar_one_or_none()

    if row is None:
        return None

    try:
        session.execute(
            update(InboundMessageQueueModel)
            .where(InboundMessageQueueModel.id == row.id)
            .values(status="processing", locked_at=now, attempts=row.attempts + 1)
        )
        session.commit()
        INBOUND_QUEUE_CLAIMED.inc()
        return row
    except Exception as e:
        session.rollback()
        logging.warning(f"Failed to claim queue item id={row.id}: {e}")
        INBOUND_QUEUE_CLAIM_FAILURES.inc()
        return None


async def worker_loop(stop_event: asyncio.Event) -> None:
    """Simple worker loop: claim one item, process, repeat with small sleep."""
    llm_service = cast(_LLMRunner, get_llm_service())
    while not stop_event.is_set():
        try:
            with get_session() as session:
                _update_queue_metrics(session)
                item = _claim_one(session)
                if item is None:
                    await asyncio.sleep(QUEUE_POLL_INTERVAL_SECONDS)
                    continue

                payload_text: str = str(getattr(item, "payload", ""))
                try:
                    decoded = json.loads(payload_text)
                    payload_obj = (
                        decoded if isinstance(decoded, dict) else {"_raw": decoded}
                    )
                except Exception:
                    payload_obj = {"_raw": payload_text}

                try:
                    # Process and mark done/failed
                    await process_whatsapp_message(payload_obj, llm_service.run)  # type: ignore[no-untyped-call]
                    session.execute(
                        update(InboundMessageQueueModel)
                        .where(InboundMessageQueueModel.id == item.id)
                        .values(status="done", locked_at=None)
                    )
                    session.commit()
                    INBOUND_QUEUE_PROCESSED.inc()
                except Exception as e:
                    logging.error(f"Inbound queue item {item.id} failed: {e}")
                    if (item.attempts or 0) + 1 >= MAX_PROCESSING_ATTEMPTS:
                        # give up
                        try:
                            session.execute(
                                update(InboundMessageQueueModel)
                                .where(InboundMessageQueueModel.id == item.id)
                                .values(status="failed", locked_at=None)
                            )
                            session.commit()
                        except Exception:
                            session.rollback()
                    else:
                        # Return to pending for retry later
                        try:
                            session.execute(
                                update(InboundMessageQueueModel)
                                .where(InboundMessageQueueModel.id == item.id)
                                .values(status="pending", locked_at=None)
                            )
                            session.commit()
                        except Exception:
                            session.rollback()
                    INBOUND_QUEUE_PROCESSING_ERRORS.inc()
        except Exception as loop_err:
            logging.error(f"Inbound worker loop error: {loop_err}")
            await asyncio.sleep(QUEUE_POLL_INTERVAL_SECONDS)


def spawn_workers(num_workers: int) -> tuple[asyncio.Event, list[asyncio.Task[None]]]:
    stop_event: asyncio.Event = asyncio.Event()
    tasks: list[asyncio.Task[None]] = []
    for _ in range(max(1, int(num_workers))):
        tasks.append(asyncio.create_task(worker_loop(stop_event)))
    return stop_event, tasks


async def stop_workers(
    stop_event: asyncio.Event, tasks: list[asyncio.Task[None]]
) -> None:
    try:
        stop_event.set()
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception:
        pass
