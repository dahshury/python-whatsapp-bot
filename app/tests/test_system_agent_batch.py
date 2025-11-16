
from app.services.domain.system_agent import SystemAgentBatchService


class StubReservationService:
    def __init__(self, fail_on_call: int | None = None):
        self.calls = []
        self.fail_on_call = fail_on_call

    def reserve_time_slot(self, **kwargs):
        self.calls.append(("reserve", kwargs))
        if self.fail_on_call and len(self.calls) == self.fail_on_call:
            raise ValueError("reserve failed")
        return {"success": True, "data": kwargs}

    def modify_reservation(self, **kwargs):
        self.calls.append(("modify", kwargs))
        return {"success": True, "data": kwargs}

    def cancel_reservation(self, **kwargs):
        self.calls.append(("cancel", kwargs))
        return {"success": True, "data": kwargs}


class StubAvailabilityService:
    def get_available_time_slots(self, date, max_reservations=5, hijri=False):
        return {"success": True, "data": {"date": date, "max": max_reservations, "hijri": hijri}}


def create_service(reservation_stub: StubReservationService) -> SystemAgentBatchService:
    # Only reservation_service is exercised in these tests; provide simple stubs for the rest
    return SystemAgentBatchService(
        reservation_service=reservation_stub,
        customer_service=object(),
        phone_search_service=object(),
        availability_service=StubAvailabilityService(),
    )


def test_batch_reserve_success():
    reservation_stub = StubReservationService()
    service = create_service(reservation_stub)

    payloads = [
        {"wa_id": "1", "customer_name": "A", "date_str": "2025-01-01", "time_slot": "09:00", "reservation_type": 0},
        {"wa_id": "2", "customer_name": "B", "date_str": "2025-01-01", "time_slot": "10:00", "reservation_type": 1},
    ]

    result = service.batch_reserve(payloads)
    assert result["success"] is True
    assert len(result["data"]) == 2
    assert all(entry["success"] for entry in result["data"])
    assert len(reservation_stub.calls) == 2


def test_batch_reserve_captures_failures():
    reservation_stub = StubReservationService(fail_on_call=2)
    service = create_service(reservation_stub)

    payloads = [
        {"wa_id": "1", "customer_name": "A", "date_str": "2025-01-01", "time_slot": "09:00", "reservation_type": 0},
        {"wa_id": "2", "customer_name": "B", "date_str": "2025-01-01", "time_slot": "10:00", "reservation_type": 1},
    ]

    result = service.batch_reserve(payloads)
    assert result["success"] is True
    assert result["data"][0]["success"] is True
    assert result["data"][1]["success"] is False
    assert "error" in result["data"][1]


def test_batch_modify_invokes_underlying_service():
    reservation_stub = StubReservationService()
    service = create_service(reservation_stub)

    payloads = [
        {"wa_id": "1", "new_date": "2025-02-01", "reservation_id_to_modify": 123},
    ]

    result = service.batch_modify(payloads)
    assert result["success"] is True
    assert reservation_stub.calls[0][0] == "modify"


def test_batch_cancel_invokes_underlying_service():
    reservation_stub = StubReservationService()
    service = create_service(reservation_stub)

    payloads = [
        {"wa_id": "1", "reservation_id_to_cancel": 555},
    ]

    result = service.batch_cancel(payloads)
    assert result["success"] is True
    assert reservation_stub.calls[0][0] == "cancel"

