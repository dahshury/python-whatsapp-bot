from __future__ import annotations

import calendar
import datetime as dt
import re
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from statistics import median
from zoneinfo import ZoneInfo

from prometheus_client import generate_latest
from sqlalchemy import func, select

from app.config import config
from app.db import ConversationModel, ReservationModel, get_session
from app.utils.realtime import _parse_prometheus_text as parse_prometheus_text


class DashboardAnalyticsService:
    """Compute aggregated dashboard statistics without streaming entire datasets."""

    DEFAULT_RANGE_DAYS = 30
    MAX_RESPONSE_TIME_MINUTES = 60
    WORD_MIN_LENGTH = 3
    TOP_WORDS_LIMIT = 50

    _DIGITS_RE = re.compile(r"\d+")
    _NON_TEXT_RE = re.compile(r"[^\w\s\u0600-\u06FF]+")
    _SPLIT_RE = re.compile(r"\s+")

    _EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    _AR_MONTHS = [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
    ]

    def __init__(self, timezone: str | None = None) -> None:
        self.timezone = timezone or config.get("TIMEZONE", "UTC")

    # --------------------------------------------------------------------- API
    def get_dashboard_data(
        self,
        from_date: str | None = None,
        to_date: str | None = None,
        locale: str | None = None,
    ) -> dict:
        """Return aggregated dashboard data for the requested window."""

        start_date, end_date = self._normalize_range(from_date, to_date)
        prev_start, prev_end = self._compute_previous_range(start_date, end_date)

        reservations = self._fetch_reservations(start_date, end_date)
        conversations = self._fetch_conversations(start_date, end_date)
        prev_conversations = self._fetch_conversations(prev_start, prev_end)

        reservations_by_customer = self._group_by_customer(reservations)
        conversations_by_customer = self._group_by_customer(conversations)

        reservation_counts = {wa_id: len(items) for wa_id, items in reservations_by_customer.items()}
        reservation_ids = set(reservation_counts.keys())
        conversation_ids = {entry["wa_id"] for entry in conversations if entry["wa_id"]}

        unique_customers = self._count_first_reservations(start_date, end_date)
        prev_unique_customers = self._count_first_reservations(prev_start, prev_end)
        active_customers = self._count_active_customers()
        prev_totals = self._count_reservation_totals(prev_start, prev_end)
        prev_returning_metrics = self._returning_metrics_between(prev_start, prev_end)
        prev_reservation_ids = self._fetch_reservation_ids(prev_start, prev_end)

        total_reservations = len(reservations)
        total_cancellations = sum(1 for entry in reservations if entry["status"] == "cancelled")

        returning_customers = sum(1 for count in reservation_counts.values() if count > 1)
        avg_followups = self._compute_avg_followups(reservation_counts)

        conversion_rate = self._compute_conversion_rate(conversation_ids, reservation_ids)
        prev_conversion_rate = self._compute_conversion_rate(
            {entry["wa_id"] for entry in prev_conversations if entry["wa_id"]},
            prev_reservation_ids,
        )

        response_stats = self._compute_response_time_stats(conversations_by_customer)
        prev_response_stats = self._compute_response_time_stats(self._group_by_customer(prev_conversations))

        stats = self._build_stats(
            total_reservations=total_reservations,
            total_cancellations=total_cancellations,
            unique_customers=unique_customers,
            returning_customers=returning_customers,
            avg_followups=avg_followups,
            conversion_rate=conversion_rate,
            response_stats=response_stats,
            active_customers=active_customers,
            prev_totals=prev_totals,
            prev_unique_customers=prev_unique_customers,
            prev_avg_followups=prev_returning_metrics["avg_followups"],
            prev_conversion_rate=prev_conversion_rate,
            prev_response_avg=prev_response_stats["avg"],
        )

        locale_code = (locale or "en").lower()
        month_labels = self._AR_MONTHS if locale_code.startswith("ar") else self._EN_MONTHS

        funnel_data = self._build_funnel_data(
            len(conversation_ids),
            len(reservation_ids),
            returning_customers,
            total_cancellations,
        )

        customer_segments = self._compute_customer_segments(reservation_counts, unique_customers)
        conversation_analysis = self._compute_conversation_analysis(conversations_by_customer, unique_customers)

        data = {
            "_isMockData": False,
            "stats": stats,
            "prometheusMetrics": self._load_prometheus_metrics(),
            "dailyTrends": self._compute_daily_trends(reservations, start_date, end_date),
            "typeDistribution": self._compute_type_distribution(reservations),
            "timeSlots": self._compute_time_slots(reservations),
            "messageHeatmap": self._compute_message_heatmap(conversations),
            "topCustomers": self._compute_top_customers(reservations_by_customer, conversations_by_customer),
            "conversationAnalysis": conversation_analysis,
            "wordFrequency": self._compute_word_frequency(conversations),
            "wordFrequencyByRole": self._compute_word_frequency_by_role(conversations),
            "dayOfWeekData": self._compute_day_of_week_data(reservations),
            "monthlyTrends": self._compute_monthly_trends(reservations, conversations, month_labels),
            "funnelData": funnel_data,
            "customerSegments": customer_segments,
        }
        return data

    # --------------------------------------------------------------- Fetching
    def _fetch_reservations(self, start: dt.date, end: dt.date) -> list[dict]:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.id,
                    ReservationModel.wa_id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                    ReservationModel.cancelled_at,
                    ReservationModel.updated_at,
                    ReservationModel.created_at,
                )
                .where(
                    ReservationModel.date >= start_str,
                    ReservationModel.date <= end_str,
                )
                .order_by(ReservationModel.date.asc(), ReservationModel.time_slot.asc())
            )
            rows = session.execute(stmt).all()

        reservations: list[dict] = []
        for row in rows:
            timestamp = self._combine_date_time(row.date, row.time_slot)
            reservations.append(
                {
                    "id": row.id,
                    "wa_id": row.wa_id or "",
                    "date": row.date,
                    "time_slot": row.time_slot,
                    "type": int(row.type) if row.type is not None else None,
                    "status": row.status or "active",
                    "cancelled_at": row.cancelled_at,
                    "updated_at": row.updated_at,
                    "created_at": row.created_at,
                    "timestamp": timestamp,
                }
            )
        return reservations

    def _fetch_conversations(self, start: dt.date, end: dt.date) -> list[dict]:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            stmt = (
                select(
                    ConversationModel.id,
                    ConversationModel.wa_id,
                    ConversationModel.role,
                    ConversationModel.message,
                    ConversationModel.date,
                    ConversationModel.time,
                )
                .where(
                    ConversationModel.date >= start_str,
                    ConversationModel.date <= end_str,
                )
                .order_by(ConversationModel.date.asc(), ConversationModel.time.asc())
            )
            rows = session.execute(stmt).all()

        conversations: list[dict] = []
        for row in rows:
            message_dt = self._combine_date_time(row.date, row.time)
            if not message_dt:
                continue
            role = (row.role or "").strip().lower() or "user"
            conversations.append(
                {
                    "id": row.id,
                    "wa_id": row.wa_id or "",
                    "role": role,
                    "message": row.message or "",
                    "datetime": message_dt,
                }
            )
        return conversations

    # -------------------------------------------------------------- Aggregates
    def _count_first_reservations(self, start: dt.date, end: dt.date) -> int:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            subq = (
                select(
                    ReservationModel.wa_id.label("wa_id"),
                    func.min(ReservationModel.date).label("first_date"),
                )
                .group_by(ReservationModel.wa_id)
                .subquery()
            )
            stmt = select(func.count()).where(subq.c.first_date >= start_str, subq.c.first_date <= end_str)
            result = session.execute(stmt).scalar()
        return int(result or 0)

    def _count_active_customers(self) -> int:
        today = dt.datetime.now(ZoneInfo(self.timezone)).date().isoformat()

        with get_session() as session:
            stmt = (
                select(func.count(func.distinct(ReservationModel.wa_id)))
                .where(ReservationModel.status == "active", ReservationModel.date >= today)
                .execution_options(populate_existing=True)
            )
            result = session.execute(stmt).scalar()
        return int(result or 0)

    def _count_reservation_totals(self, start: dt.date, end: dt.date) -> dict[str, int]:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            total_stmt = (
                select(func.count())
                .where(ReservationModel.date >= start_str, ReservationModel.date <= end_str)
                .execution_options(populate_existing=True)
            )
            cancelled_stmt = (
                select(func.count())
                .where(
                    ReservationModel.date >= start_str,
                    ReservationModel.date <= end_str,
                    ReservationModel.status == "cancelled",
                )
                .execution_options(populate_existing=True)
            )
            total = session.execute(total_stmt).scalar()
            cancelled = session.execute(cancelled_stmt).scalar()
        return {"reservations": int(total or 0), "cancellations": int(cancelled or 0)}

    def _returning_metrics_between(self, start: dt.date, end: dt.date) -> dict[str, float]:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.wa_id.label("wa_id"),
                    func.count(ReservationModel.id).label("cnt"),
                )
                .where(ReservationModel.date >= start_str, ReservationModel.date <= end_str)
                .group_by(ReservationModel.wa_id)
                .having(func.count(ReservationModel.id) > 1)
            )
            rows = session.execute(stmt).all()

        returning_customers = 0
        total_followups = 0
        for row in rows:
            cnt = int(row.cnt or 0)
            if cnt > 1:
                returning_customers += 1
                total_followups += cnt - 1
        avg_followups = total_followups / returning_customers if returning_customers else 0.0
        return {"returning_customers": returning_customers, "avg_followups": avg_followups}

    def _fetch_reservation_ids(self, start: dt.date, end: dt.date) -> set[str]:
        start_str = start.isoformat()
        end_str = end.isoformat()

        with get_session() as session:
            stmt = (
                select(ReservationModel.wa_id)
                .where(ReservationModel.date >= start_str, ReservationModel.date <= end_str)
                .distinct()
            )
            rows = session.execute(stmt).scalars().all()
        return {wa_id for wa_id in rows if wa_id}

    # ------------------------------------------------------------ Computations
    def _build_stats(
        self,
        *,
        total_reservations: int,
        total_cancellations: int,
        unique_customers: int,
        returning_customers: int,
        avg_followups: float,
        conversion_rate: float,
        response_stats: dict[str, float],
        active_customers: int,
        prev_totals: dict[str, int],
        prev_unique_customers: int,
        prev_avg_followups: float,
        prev_conversion_rate: float,
        prev_response_avg: float,
    ) -> dict:
        returning_rate = (returning_customers / unique_customers * 100) if unique_customers else 0.0

        trends = {
            "totalReservations": self._compute_trend(total_reservations, prev_totals.get("reservations", 0), True),
            "cancellations": self._compute_trend(total_cancellations, prev_totals.get("cancellations", 0), False),
            "avgResponseTime": self._compute_trend(response_stats["avg"], prev_response_avg, False),
            "avgFollowups": self._compute_trend(avg_followups, prev_avg_followups, True),
            "uniqueCustomers": self._compute_trend(unique_customers, prev_unique_customers, True),
            "conversionRate": self._compute_trend(conversion_rate, prev_conversion_rate, True),
        }

        return {
            "totalReservations": total_reservations,
            "totalCancellations": total_cancellations,
            "uniqueCustomers": unique_customers,
            "conversionRate": conversion_rate,
            "returningCustomers": returning_customers,
            "returningRate": returning_rate,
            "avgFollowups": avg_followups,
            "avgResponseTime": response_stats["avg"],
            "activeCustomers": active_customers,
            "trends": trends,
        }

    def _build_funnel_data(
        self,
        conversations_count: int,
        reservations_count: int,
        returning_customers: int,
        cancellations: int,
    ) -> list[dict]:
        stages = [
            {"stage": "Conversations", "count": conversations_count},
            {"stage": "Made reservation", "count": reservations_count},
            {"stage": "Returned for another", "count": returning_customers},
            {"stage": "Cancelled", "count": cancellations},
        ]
        return stages

    def _compute_customer_segments(self, reservation_counts: dict[str, int], unique_customers: int) -> list[dict]:
        new_customers = 0
        returning = 0
        loyal = 0
        for count in reservation_counts.values():
            if count <= 1:
                new_customers += 1
            elif count <= 5:
                returning += 1
            else:
                loyal += 1

        def pct(value: int) -> float:
            return (value / unique_customers * 100) if unique_customers else 0.0

        return [
            {
                "segment": "New (1 visit)",
                "count": new_customers,
                "percentage": pct(new_customers),
                "avgReservations": 1 if new_customers else 0,
            },
            {
                "segment": "Returning (2-5 visits)",
                "count": returning,
                "percentage": pct(returning),
                "avgReservations": 3 if returning else 0,
            },
            {
                "segment": "Loyal (6+ visits)",
                "count": loyal,
                "percentage": pct(loyal),
                "avgReservations": 6 if loyal else 0,
            },
        ]

    def _compute_daily_trends(self, reservations: Sequence[dict], start: dt.date, end: dt.date) -> list[dict]:
        daily = defaultdict(lambda: {"reservations": 0, "cancellations": 0, "modifications": 0})

        for reservation in reservations:
            date_key = reservation["date"]
            entry = daily[date_key]
            entry["reservations"] += 1
            if reservation["status"] == "cancelled":
                entry["cancellations"] += 1

        start_str = start.isoformat()
        end_str = end.isoformat()
        for reservation in reservations:
            updated_at = reservation.get("updated_at")
            created_at = reservation.get("created_at")
            if not isinstance(updated_at, dt.datetime):
                continue
            if isinstance(created_at, dt.datetime) and updated_at == created_at:
                continue
            day = updated_at.date().isoformat()
            if start_str <= day <= end_str:
                daily[day]["modifications"] += 1

        return [
            {"date": day, **values}
            for day, values in sorted(daily.items(), key=lambda item: item[0])
        ]

    def _compute_type_distribution(self, reservations: Sequence[dict]) -> list[dict]:
        checkup = 0
        followup = 0
        for reservation in reservations:
            reservation_type = reservation.get("type")
            if reservation_type == 1:
                followup += 1
            else:
                checkup += 1
        return [
            {"type": 0, "label": "Checkup", "count": checkup},
            {"type": 1, "label": "Followup", "count": followup},
        ]

    def _compute_time_slots(self, reservations: Sequence[dict]) -> list[dict]:
        counts: Counter[str] = Counter()
        for reservation in reservations:
            timestamp: dt.datetime | None = reservation.get("timestamp")
            if not timestamp:
                continue
            key = timestamp.strftime("%H:%M")
            counts[key] += 1

        return [
            {
                "slot": slot,
                "time": slot,
                "count": count,
                "normalized": count,
                "type": "regular",
                "availDays": 0,
            }
            for slot, count in sorted(counts.items())
        ]

    def _compute_message_heatmap(self, conversations: Sequence[dict]) -> list[dict]:
        counts: Counter[tuple[str, int]] = Counter()
        for message in conversations:
            ts: dt.datetime | None = message.get("datetime")
            if not ts:
                continue
            weekday = calendar.day_name[ts.weekday()]
            counts[(weekday, ts.hour)] += 1

        return [
            {"weekday": weekday, "hour": hour, "count": count}
            for (weekday, hour), count in counts.items()
        ]

    def _compute_day_of_week_data(self, reservations: Sequence[dict]) -> list[dict]:
        summary: dict[str, dict[str, float]] = defaultdict(lambda: {"reservations": 0, "cancellations": 0})
        for reservation in reservations:
            ts: dt.datetime | None = reservation.get("timestamp")
            if not ts:
                continue
            weekday = calendar.day_name[ts.weekday()]
            entry = summary[weekday]
            entry["reservations"] += 1
            if reservation["status"] == "cancelled":
                entry["cancellations"] += 1

        day_of_week_data = []
        for day, entry in summary.items():
            reservations_count = entry["reservations"]
            cancel_rate = (entry["cancellations"] / reservations_count * 100) if reservations_count else 0.0
            day_of_week_data.append(
                {
                    "day": day,
                    "reservations": int(reservations_count),
                    "cancellations": int(entry["cancellations"]),
                    "cancelRate": cancel_rate,
                }
            )
        return day_of_week_data

    def _compute_monthly_trends(
        self,
        reservations: Sequence[dict],
        conversations: Sequence[dict],
        month_labels: Sequence[str],
    ) -> list[dict]:
        monthly: dict[tuple[int, int], dict[str, int]] = defaultdict(lambda: {"reservations": 0, "cancellations": 0, "conversations": 0})

        for reservation in reservations:
            ts: dt.datetime | None = reservation.get("timestamp")
            if not ts:
                continue
            key = (ts.year, ts.month)
            monthly[key]["reservations"] += 1
            if reservation["status"] == "cancelled":
                monthly[key]["cancellations"] += 1

        for message in conversations:
            ts: dt.datetime | None = message.get("datetime")
            if not ts:
                continue
            key = (ts.year, ts.month)
            monthly[key]["conversations"] += 1

        trends = []
        for (_year, month), values in sorted(monthly.items()):
            idx = max(1, min(12, month)) - 1
            label = month_labels[idx]
            trends.append(
                {
                    "month": label,
                    "reservations": values["reservations"],
                    "cancellations": values["cancellations"],
                    "conversations": values["conversations"],
                }
            )
        return trends

    def _compute_top_customers(
        self,
        reservations_by_customer: dict[str, list[dict]],
        conversations_by_customer: dict[str, list[dict]],
        limit: int = 50,
    ) -> list[dict]:
        entries: list[dict] = []
        customer_ids = set(reservations_by_customer.keys()) | set(conversations_by_customer.keys())
        for wa_id in customer_ids:
            if not wa_id:
                continue
            reservation_entries = reservations_by_customer.get(wa_id, [])
            conversation_entries = conversations_by_customer.get(wa_id, [])
            last_activity_dates: list[dt.datetime] = []
            last_activity_dates.extend(
                reservation["timestamp"]
                for reservation in reservation_entries
                if isinstance(reservation.get("timestamp"), dt.datetime)
            )
            last_activity_dates.extend(
                message["datetime"]
                for message in conversation_entries
                if isinstance(message.get("datetime"), dt.datetime)
            )
            last_activity = (
                max(last_activity_dates).date().isoformat()
                if last_activity_dates
                else ""
            )
            entries.append(
                {
                    "wa_id": wa_id,
                    "messageCount": len(conversation_entries),
                    "reservationCount": len(reservation_entries),
                    "lastActivity": last_activity,
                }
            )

        entries.sort(key=lambda entry: (entry["messageCount"], entry["reservationCount"]), reverse=True)
        return entries[:limit]

    def _compute_conversation_analysis(
        self,
        conversations_by_customer: dict[str, list[dict]],
        unique_customers: int,
    ) -> dict:
        total_messages = 0
        total_chars = 0
        total_words = 0
        per_customer_counts: list[int] = []

        for messages in conversations_by_customer.values():
            count = len(messages)
            per_customer_counts.append(count)
            total_messages += count
            for message in messages:
                text = str(message.get("message") or "")
                total_chars += len(text)
                total_words += len(self._tokenize(text))

        response_stats = self._compute_response_time_stats(conversations_by_customer)

        avg_messages_per_customer = (total_messages / unique_customers) if unique_customers else 0.0

        return {
            "avgMessageLength": (total_chars / total_messages) if total_messages else 0.0,
            "avgWordsPerMessage": (total_words / total_messages) if total_messages else 0.0,
            "avgMessagesPerCustomer": avg_messages_per_customer,
            "totalMessages": total_messages,
            "uniqueCustomers": unique_customers,
            "responseTimeStats": response_stats,
            "messageCountDistribution": {
                "avg": avg_messages_per_customer,
                "median": median(per_customer_counts) if per_customer_counts else 0.0,
                "max": max(per_customer_counts) if per_customer_counts else 0,
            },
        }

    def _compute_response_time_stats(self, messages_by_customer: dict[str, list[dict]]) -> dict[str, float]:
        durations: list[float] = []
        for messages in messages_by_customer.values():
            sorted_messages = sorted(messages, key=lambda msg: msg.get("datetime") or dt.datetime.min)
            for idx in range(1, len(sorted_messages)):
                prev = sorted_messages[idx - 1]
                curr = sorted_messages[idx]
                prev_role = str(prev.get("role") or "").lower()
                curr_role = str(curr.get("role") or "").lower()
                prev_dt: dt.datetime | None = prev.get("datetime")
                curr_dt: dt.datetime | None = curr.get("datetime")
                if not prev_dt or not curr_dt:
                    continue
                if prev_role != "assistant" and curr_role == "assistant":
                    delta = (curr_dt - prev_dt).total_seconds() / 60
                    if delta > 0:
                        durations.append(delta)

        avg_value = min(self.MAX_RESPONSE_TIME_MINUTES, self._safe_average(durations))
        return {
            "avg": avg_value,
            "median": median(durations) if durations else 0.0,
            "max": max(durations) if durations else 0.0,
        }

    def _compute_word_frequency(self, conversations: Sequence[dict]) -> list[dict]:
        counts: Counter[str] = Counter()
        for message in conversations:
            # Skip tool calls - only analyze legitimate user and assistant messages
            role = str(message.get("role") or "").strip().lower()
            if role == "tool":
                continue

            text = str(message.get("message") or "")
            tokens = self._tokenize(text)
            counts.update(tokens)
        return [
            {"word": word, "count": count}
            for word, count in counts.most_common(self.TOP_WORDS_LIMIT)
        ]

    def _compute_word_frequency_by_role(self, conversations: Sequence[dict]) -> dict[str, list[dict]]:
        user_counts: Counter[str] = Counter()
        assistant_counts: Counter[str] = Counter()

        for message in conversations:
            role = str(message.get("role") or "").strip().lower()
            if role == "tool":
                continue

            text = str(message.get("message") or "")
            tokens = self._tokenize(text)

            if role == "user":
                user_counts.update(tokens)
            elif role == "assistant":
                assistant_counts.update(tokens)

        return {
            "user": [
                {"word": word, "count": count}
                for word, count in user_counts.most_common(self.TOP_WORDS_LIMIT)
            ],
            "assistant": [
                {"word": word, "count": count}
                for word, count in assistant_counts.most_common(self.TOP_WORDS_LIMIT)
            ],
        }

    # ------------------------------------------------------------ Util helpers
    def _normalize_range(self, from_str: str | None, to_str: str | None) -> tuple[dt.date, dt.date]:
        tz = ZoneInfo(self.timezone)
        today = dt.datetime.now(tz).date()

        to_date = self._parse_date(to_str) or today
        if to_date > today:
            to_date = today

        if from_str:
            parsed_from = self._parse_date(from_str)
            from_date = parsed_from or (to_date - dt.timedelta(days=self.DEFAULT_RANGE_DAYS - 1))
        else:
            from_date = to_date - dt.timedelta(days=self.DEFAULT_RANGE_DAYS - 1)

        if from_date > to_date:
            from_date, to_date = to_date, from_date

        return from_date, to_date

    def _compute_previous_range(self, start: dt.date, end: dt.date) -> tuple[dt.date, dt.date]:
        span_days = max(1, (end - start).days + 1)
        prev_end = start - dt.timedelta(days=1)
        prev_start = prev_end - dt.timedelta(days=span_days - 1)
        return prev_start, prev_end

    @staticmethod
    def _parse_date(value: str | None) -> dt.date | None:
        if not value:
            return None
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _combine_date_time(date_str: str | None, time_str: str | None) -> dt.datetime | None:
        if not date_str:
            return None
        try:
            base_date = dt.date.fromisoformat(date_str)
        except ValueError:
            return None

        time_value: dt.time | None = None
        if time_str:
            stripped = time_str.strip()
            for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p"):
                try:
                    time_value = dt.datetime.strptime(stripped, fmt).time()
                    break
                except ValueError:
                    continue
        if time_value is None:
            time_value = dt.time(0, 0)

        return dt.datetime.combine(base_date, time_value)

    @staticmethod
    def _group_by_customer(items: Iterable[dict]) -> dict[str, list[dict]]:
        grouped: dict[str, list[dict]] = defaultdict(list)
        for item in items:
            wa_id = item.get("wa_id") or ""
            if wa_id:
                grouped[wa_id].append(item)
        return grouped

    @staticmethod
    def _compute_avg_followups(reservation_counts: dict[str, int]) -> float:
        followup_totals = [count - 1 for count in reservation_counts.values() if count > 1]
        if not followup_totals:
            return 0.0
        return sum(followup_totals) / len(followup_totals)

    @staticmethod
    def _compute_conversion_rate(conversation_ids: set[str], reservation_ids: set[str]) -> float:
        if not conversation_ids:
            return 0.0
        converted = len(conversation_ids & reservation_ids)
        return (converted / len(conversation_ids)) * 100

    @staticmethod
    def _compute_trend(current: float, previous: float, higher_is_better: bool) -> dict:
        if previous == 0:
            percent_change = 100.0 if current > 0 else 0.0
            is_positive = current > 0 if higher_is_better else current == 0
            return {"percentChange": percent_change, "isPositive": is_positive}
        delta = ((current - previous) / abs(previous)) * 100
        is_positive = delta >= 0 if higher_is_better else delta <= 0
        return {"percentChange": delta, "isPositive": is_positive}

    def _load_prometheus_metrics(self) -> dict[str, float]:
        try:
            metrics_text = generate_latest().decode("utf-8")
            return parse_prometheus_text(metrics_text)
        except Exception:
            return {}

    @classmethod
    def _tokenize(cls, text: str) -> list[str]:
        lowered = text.lower()
        without_digits = cls._DIGITS_RE.sub(" ", lowered)
        cleaned = cls._NON_TEXT_RE.sub(" ", without_digits)
        return [token for token in cls._SPLIT_RE.split(cleaned) if len(token) >= cls.WORD_MIN_LENGTH]

    @staticmethod
    def _safe_average(values: Sequence[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

