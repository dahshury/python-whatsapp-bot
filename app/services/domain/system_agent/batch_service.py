from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

from sqlalchemy import and_, select

from app.db import CustomerModel, ReservationModel, get_session
from app.services.domain.customer.customer_service import CustomerService
from app.services.domain.customer.phone_search_service import PhoneSearchService
from app.services.domain.reservation.availability_service import AvailabilityService
from app.services.domain.reservation.reservation_service import ReservationService
from app.services.domain.shared.base_service import BaseService
from app.utils import format_response

SUMMARY_SAMPLE_LIMIT = 50
DEFAULT_QUERY_OUTPUT_LIMIT = 200
MAX_QUERY_OUTPUT_LIMIT = 500


class SystemAgentBatchService(BaseService):
    """
    Domain-level orchestrator that exposes batch operations for the internal system agent.
    """

    def __init__(
        self,
        *,
        reservation_service: ReservationService | None = None,
        customer_service: CustomerService | None = None,
        phone_search_service: PhoneSearchService | None = None,
        availability_service: AvailabilityService | None = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        self.reservation_service = reservation_service or ReservationService(logger=self.logger)
        self.customer_service = customer_service or CustomerService(logger=self.logger)
        self.phone_search_service = phone_search_service or PhoneSearchService(logger=self.logger)
        self.availability_service = availability_service or AvailabilityService(
            reservation_repository=self.reservation_service.reservation_repository,
            logger=self.logger,
        )

    def get_service_name(self) -> str:
        return "SystemAgentBatchService"

    # ------------------------------------------------------------------ retrieval helpers
    def get_reservations(
        self,
        *,
        dates: Sequence[str] | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        wa_ids: Sequence[str] | None = None,
        include_cancelled: bool = False,
        reservation_types: Sequence[int] | None = None,
    ) -> dict[str, Any]:
        """
        Fetch reservation records with flexible filtering for agent introspection.
        """
        try:
            with get_session() as session:
                stmt = (
                    select(
                        ReservationModel.id,
                        ReservationModel.wa_id,
                        ReservationModel.date,
                        ReservationModel.time_slot,
                        ReservationModel.type,
                        ReservationModel.status,
                        CustomerModel.customer_name,
                    )
                    .join(CustomerModel, ReservationModel.wa_id == CustomerModel.wa_id, isouter=True)
                    .order_by(ReservationModel.date.asc(), ReservationModel.time_slot.asc())
                )

                filters = []
                if dates:
                    filters.append(ReservationModel.date.in_(list(dates)))
                else:
                    if start_date:
                        filters.append(ReservationModel.date >= start_date)
                    if end_date:
                        filters.append(ReservationModel.date <= end_date)

                if wa_ids:
                    filters.append(ReservationModel.wa_id.in_(list(wa_ids)))

                if reservation_types:
                    filters.append(ReservationModel.type.in_(list(reservation_types)))

                if not include_cancelled:
                    filters.append(ReservationModel.status == "active")

                if filters:
                    stmt = stmt.where(and_(*filters))

                rows = session.execute(stmt).all()

            data = [
                {
                    "id": row.id,
                    "wa_id": row.wa_id,
                    "date": row.date,
                    "time_slot": row.time_slot,
                    "type": row.type,
                    "status": row.status,
                    "customer_name": row.customer_name,
                }
                for row in rows
            ]
            return format_response(True, data=data)
        except Exception as exc:
            return self._handle_error("get_reservations", exc)

    def query_customers_and_reservations(
        self,
        *,
        search_query: str | None = None,
        wa_ids: Sequence[str] | str | None = None,
        dates: Sequence[str] | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        include_cancelled: bool = False,
        reservation_types: Sequence[int] | None = None,
        include: Sequence[str] | None = None,
        limit: int = 50,
        max_results: int | None = None,
    ) -> dict[str, Any]:
        """
        Swiss-army helper that returns reservations, distinct WA IDs, and/or customer metadata
        based on fuzzy queries and/or date filters.
        """
        allowed_sections = {"reservations", "wa_ids", "customers"}
        include_set = {str(item).lower() for item in include or []}
        include_set = {section for section in include_set if section in allowed_sections}
        if not include_set:
            include_set = allowed_sections.copy()
        normalized_query = (
            search_query.strip() if isinstance(search_query, str) and search_query.strip() else None
        )
        if normalized_query:
            include_set.add("customers")

        include_reservations = "reservations" in include_set
        include_wa_ids = "wa_ids" in include_set
        include_customers = "customers" in include_set

        normalized_limit = max(1, min(int(limit) if limit else 50, 200))
        try:
            requested_cap = int(max_results) if max_results is not None else DEFAULT_QUERY_OUTPUT_LIMIT
        except (TypeError, ValueError):
            requested_cap = DEFAULT_QUERY_OUTPUT_LIMIT
        result_cap = max(1, min(requested_cap, MAX_QUERY_OUTPUT_LIMIT))

        def _coerce_wa_ids(value: Sequence[str] | str | None) -> list[str] | None:
            if value is None:
                return None
            if isinstance(value, str):
                return [value]
            return [str(item) for item in value if item is not None]

        wa_filter_list = _coerce_wa_ids(wa_ids)
        wa_pool: set[str] = set(wa_filter_list or [])
        customer_records: dict[str, dict[str, Any]] = {}
        search_matches: list[dict[str, Any]] = []

        if normalized_query:
            try:
                matches = self.phone_search_service.search_phones(normalized_query, limit=normalized_limit)
            except Exception as exc:
                return self._handle_error("query_customers.search", exc)
            for entry in matches:
                record = entry.to_dict()
                wa = str(record.get("wa_id") or record.get("waId") or "").strip()
                if wa:
                    record["wa_id"] = wa
                    wa_pool.add(wa)
                    customer_records[wa] = record
                search_matches.append(record)

        filters_applied = any(value is not None for value in (dates, start_date, end_date, reservation_types))
        should_fetch_reservations = include_reservations or include_wa_ids or filters_applied

        reservations_data: list[dict[str, Any]] = []
        if should_fetch_reservations:
            reservation_response = self.get_reservations(
                dates=dates,
                start_date=start_date,
                end_date=end_date,
                wa_ids=list(wa_pool) if wa_pool else None,
                include_cancelled=include_cancelled,
                reservation_types=reservation_types,
            )
            if not reservation_response.get("success"):
                return reservation_response
            reservations_data = reservation_response.get("data", [])
            for entry in reservations_data:
                wa = entry.get("wa_id")
                if isinstance(wa, str):
                    wa_pool.add(wa)
                    customer_records.setdefault(
                        wa,
                        {
                            "wa_id": wa,
                            "customer_name": entry.get("customer_name"),
                        },
                    )

        if include_customers:
            missing = [wa for wa in wa_pool if wa not in customer_records]
            if missing:
                try:
                    stmt = (
                        select(
                            CustomerModel.wa_id,
                            CustomerModel.customer_name,
                            CustomerModel.is_blocked,
                            CustomerModel.is_favorite,
                        )
                        .where(CustomerModel.wa_id.in_(missing))
                        .order_by(CustomerModel.wa_id.asc())
                    )
                    with get_session() as session:
                        for row in session.execute(stmt):
                            customer_records[row.wa_id] = {
                                "wa_id": row.wa_id,
                                "customer_name": row.customer_name,
                                "is_blocked": bool(getattr(row, "is_blocked", False)),
                                "is_favorite": bool(getattr(row, "is_favorite", False)),
                            }
                except Exception as exc:
                    return self._handle_error("query_customers.customers", exc)
            for wa in missing:
                customer_records.setdefault(wa, {"wa_id": wa})

        summary: dict[str, Any] = {
            "limits": {
                "max_results": result_cap,
                "search_limit": normalized_limit,
            },
            "filters": {
                "search_query": normalized_query,
                "wa_ids": list(wa_filter_list) if wa_filter_list else None,
                "dates": list(dates) if dates else None,
                "start_date": start_date,
                "end_date": end_date,
                "reservation_types": list(reservation_types) if reservation_types else None,
                "include_cancelled": include_cancelled,
            },
        }

        result: dict[str, Any] = {}
        if include_wa_ids:
            wa_ids_sorted = sorted(wa_pool)
            wa_ids_output = wa_ids_sorted[:result_cap]
            result["wa_ids"] = wa_ids_output
            summary["wa_ids_total"] = len(wa_ids_sorted)
            summary["wa_ids_returned"] = len(wa_ids_output)
            summary["wa_ids_truncated"] = len(wa_ids_sorted) > len(wa_ids_output)

        if include_reservations:
            reservations_output = reservations_data[:result_cap]
            result["reservations"] = reservations_output
            summary["reservations_total"] = len(reservations_data)
            summary["reservations_returned"] = len(reservations_output)
            summary["reservations_truncated"] = len(reservations_data) > len(reservations_output)

        if include_customers:
            customers_output: list[dict[str, Any]] = []
            seen: set[str] = set()
            for record in search_matches:
                wa = str(record.get("wa_id") or record.get("waId") or "").strip()
                if wa and wa in customer_records:
                    if wa in seen:
                        continue
                    customers_output.append(customer_records[wa])
                    seen.add(wa)
                else:
                    customers_output.append(record)
            for wa in sorted(customer_records.keys()):
                if wa in seen:
                    continue
                customers_output.append(customer_records[wa])
                seen.add(wa)

            customers_limited = customers_output[:result_cap]
            result["customers"] = customers_limited
            summary["customers_total"] = len(customers_output)
            summary["customers_returned"] = len(customers_limited)
            summary["customers_truncated"] = len(customers_output) > len(customers_limited)

        result["summary"] = summary
        return format_response(True, data=result)

    # ------------------------------------------------------------------ customer tools
    def search_customers(self, query: str, limit: int = 50) -> dict[str, Any]:
        """
        Proxy to fuzzy phone search used by the phone selector UI.
        """
        try:
            results = self.phone_search_service.search_phones(query, limit=limit)
            payload = [entry.to_dict() for entry in results]
            return format_response(True, data=payload)
        except Exception as exc:
            return self._handle_error("search_customers", exc)

    # ------------------------------------------------------------------ availability helpers
    def get_available_time_slots_batch(
        self, dates: Sequence[str], max_reservations: int | None = None, hijri: bool = False
    ) -> dict[str, Any]:
        """
        Fetch availability snapshots for multiple dates in one call.
        """
        try:
            snapshots: dict[str, Any] = {}
            for date_str in dates:
                response = self.availability_service.get_available_time_slots(
                    date_str,
                    max_reservations=max_reservations,
                    hijri=hijri,
                )
                snapshots[date_str] = response
            return format_response(True, data=snapshots)
        except Exception as exc:
            return self._handle_error("get_available_time_slots_batch", exc)

    # ------------------------------------------------------------------ batch orchestrators
    def batch_reserve(self, requests: Sequence[dict[str, Any]], *, verbosity: str = "summary") -> dict[str, Any]:
        """
        Reserve time slots for multiple customers.
        """
        return self._execute_batch(
            "batch_reserve", requests, self.reservation_service.reserve_time_slot, verbosity=verbosity
        )

    def batch_modify(self, requests: Sequence[dict[str, Any]], *, verbosity: str = "summary") -> dict[str, Any]:
        """
        Modify existing reservations for a group of customers.
        """
        return self._execute_batch(
            "batch_modify", requests, self.reservation_service.modify_reservation, verbosity=verbosity
        )

    def batch_cancel(self, requests: Sequence[dict[str, Any]], *, verbosity: str = "summary") -> dict[str, Any]:
        """
        Cancel reservations for multiple customers.
        """
        return self._execute_batch(
            "batch_cancel", requests, self.reservation_service.cancel_reservation, verbosity=verbosity
        )

    # ------------------------------------------------------------------ internals
    def _execute_batch(
        self,
        operation: str,
        requests: Sequence[dict[str, Any]],
        handler: Callable[..., dict[str, Any]],
        *,
        verbosity: str = "summary",
    ) -> dict[str, Any]:
        """
        Execute heterogeneous payloads sequentially and report individual outcomes.
        """
        outcomes: list[dict[str, Any]] = []
        for payload in requests or []:
            if not isinstance(payload, dict):
                outcomes.append(
                    {
                        "success": False,
                        "input": payload,
                        "error": "Invalid payload; expected an object.",
                    }
                )
                continue

            params = dict(payload)
            params.setdefault("_call_source", "system_agent")
            try:
                result = handler(**params)
            except Exception as exc:
                self.logger.error("%s failed for payload %s", operation, payload, exc_info=True)
                outcomes.append({"success": False, "input": payload, "error": str(exc)})
                continue

            success = bool(result.get("success", False)) if isinstance(result, dict) else False
            outcomes.append({"success": success, "input": payload, "result": result})

        if verbosity.lower() == "detailed":
            return format_response(True, data=outcomes)

        total = len(outcomes)
        success_count = sum(1 for entry in outcomes if entry.get("success"))
        compact_results: list[dict[str, Any]] = []
        for entry in outcomes:
            base: dict[str, Any] = {
                "success": bool(entry.get("success")),
                "wa_id": entry.get("input", {}).get("wa_id"),
            }
            if not base["success"]:
                base["error"] = entry.get("error") or entry.get("result")
            else:
                reservation_id = (
                    entry.get("input", {}).get("reservation_id_to_modify")
                    or entry.get("input", {}).get("reservation_id_to_cancel")
                    or (entry.get("result") or {}).get("data", {}).get("reservation_id")
                )
                if reservation_id:
                    base["reservation_id"] = reservation_id
                message = (entry.get("result") or {}).get("message")
                if message:
                    base["message"] = message
            compact_results.append(base)

        sample_limit = SUMMARY_SAMPLE_LIMIT
        results_sample = compact_results[:sample_limit]
        summary_payload: dict[str, Any] = {
            "summary": {
                "total": total,
                "succeeded": success_count,
                "failed": total - success_count,
                "results_included": len(results_sample),
                "results_truncated": len(compact_results) > sample_limit,
            },
        }
        if results_sample:
            summary_payload["results"] = results_sample
        return format_response(True, data=summary_payload)


