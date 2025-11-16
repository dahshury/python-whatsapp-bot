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

    def list_wa_ids_for_filters(
        self,
        *,
        dates: Sequence[str] | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        include_cancelled: bool = False,
        reservation_types: Sequence[int] | None = None,
    ) -> dict[str, Any]:
        """
        Convenience helper to extract distinct wa_ids for downstream batch operations.
        """
        result = self.get_reservations(
            dates=dates,
            start_date=start_date,
            end_date=end_date,
            include_cancelled=include_cancelled,
            reservation_types=reservation_types,
        )
        if not result.get("success"):
            return result

        wa_ids = sorted({row["wa_id"] for row in result.get("data", []) if row.get("wa_id")})
        return format_response(True, data=wa_ids)

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
        self, dates: Sequence[str], max_reservations: int = 5, hijri: bool = False
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
    def batch_reserve(self, requests: Sequence[dict[str, Any]]) -> dict[str, Any]:
        """
        Reserve time slots for multiple customers.
        """
        return self._execute_batch("batch_reserve", requests, self.reservation_service.reserve_time_slot)

    def batch_modify(self, requests: Sequence[dict[str, Any]]) -> dict[str, Any]:
        """
        Modify existing reservations for a group of customers.
        """
        return self._execute_batch("batch_modify", requests, self.reservation_service.modify_reservation)

    def batch_cancel(self, requests: Sequence[dict[str, Any]]) -> dict[str, Any]:
        """
        Cancel reservations for multiple customers.
        """
        return self._execute_batch("batch_cancel", requests, self.reservation_service.cancel_reservation)

    # ------------------------------------------------------------------ internals
    def _execute_batch(
        self,
        operation: str,
        requests: Sequence[dict[str, Any]],
        handler: Callable[..., dict[str, Any]],
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

        return format_response(True, data=outcomes)

