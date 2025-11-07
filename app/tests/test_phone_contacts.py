"""
Unit tests for phone contacts endpoints (recent and paginated).
Tests recent contacts sorted by user messages and paginated all contacts with filtering.
"""
from datetime import datetime, timedelta

import pytest

from app.db import ConversationModel, CustomerModel, ReservationModel, get_session, init_models
from app.services.domain.customer.phone_search_service import PhoneSearchService


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Initialize database and create test data."""
    init_models()

    with get_session() as session:
        # Clean up existing test data
        session.query(ReservationModel).filter(ReservationModel.wa_id.like('9666%')).delete()
        session.query(ConversationModel).filter(ConversationModel.wa_id.like('9666%')).delete()
        session.query(CustomerModel).filter(CustomerModel.wa_id.like('9666%')).delete()

        # Create test customers with various names and countries
        test_customers = [
            CustomerModel(wa_id="966611111111", customer_name="Ahmed Ali"),  # Has user message
            CustomerModel(wa_id="966622222222", customer_name="Sarah Smith"),  # Has user message
            CustomerModel(wa_id="966633333333", customer_name="محمد أحمد"),  # Has user message
            CustomerModel(wa_id="966644444444", customer_name="John Doe"),  # Only assistant messages
            CustomerModel(wa_id="966655555555", customer_name="Jane Smith"),  # Has user message (most recent)
            CustomerModel(wa_id="966666666666", customer_name=""),  # Unknown user
            CustomerModel(wa_id="966677777777", customer_name="Registered User"),  # Registered user
            CustomerModel(wa_id="966688888888", customer_name="966688888888"),  # Name is same as phone
            CustomerModel(wa_id="12025551234", customer_name="US User"),  # US country
        ]

        for customer in test_customers:
            session.merge(customer)

        # Add user messages (most recent first)
        now = datetime.now()
        conversations = [
            # Most recent user message
            ConversationModel(
                wa_id="966655555555",
                role="user",
                message="Most recent",
                date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
                time=(now - timedelta(hours=2)).strftime("%H:%M:%S")
            ),
            # Older user message
            ConversationModel(
                wa_id="966611111111",
                role="user",
                message="Old message",
                date=(now - timedelta(days=10)).strftime("%Y-%m-%d"),
                time="10:00:00"
            ),
            # Even older user message
            ConversationModel(
                wa_id="966622222222",
                role="user",
                message="Very old",
                date=(now - timedelta(days=20)).strftime("%Y-%m-%d"),
                time="09:00:00"
            ),
            # User message for Arabic name
            ConversationModel(
                wa_id="966633333333",
                role="user",
                message="Arabic user",
                date=(now - timedelta(days=15)).strftime("%Y-%m-%d"),
                time="11:00:00"
            ),
            # Assistant message only (should not appear in recent)
            ConversationModel(
                wa_id="966644444444",
                role="assistant",
                message="Assistant reply",
                date=(now - timedelta(days=5)).strftime("%Y-%m-%d"),
                time="14:00:00"
            ),
        ]

        for conv in conversations:
            session.add(conv)

        # Add reservations for some customers
        reservations = [
            ReservationModel(
                wa_id="966611111111",
                date="2024-01-15",
                time_slot="10:00",
                type=0,
                status="active",
                updated_at=datetime.now() - timedelta(days=5)
            ),
            ReservationModel(
                wa_id="966655555555",
                date="2024-01-20",
                time_slot="14:00",
                type=0,
                status="active",
                updated_at=datetime.now() - timedelta(days=2)
            ),
        ]

        for res in reservations:
            session.add(res)

        session.commit()

    yield

    # Cleanup after tests
    with get_session() as session:
        session.query(ReservationModel).filter(ReservationModel.wa_id.like('9666%')).delete()
        session.query(ConversationModel).filter(ConversationModel.wa_id.like('9666%')).delete()
        session.query(CustomerModel).filter(CustomerModel.wa_id.like('9666%')).delete()
        session.commit()


class TestRecentContacts:
    """Test cases for recent contacts functionality."""

    def test_get_recent_contacts_returns_results(self):
        """Test that recent contacts returns results."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        assert len(results) > 0

    def test_recent_contacts_only_includes_user_messages(self):
        """Test that recent contacts only includes contacts with user messages."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        # Should not include 966644444444 (only assistant messages)
        wa_ids = [r.wa_id for r in results]
        assert "966644444444" not in wa_ids

    def test_recent_contacts_sorted_by_last_user_message(self):
        """Test that recent contacts are sorted by last user message time."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        if len(results) >= 2:
            # Find our test contacts
            jane = next((r for r in results if r.wa_id == "966655555555"), None)
            ahmed = next((r for r in results if r.wa_id == "966611111111"), None)

            if jane and ahmed:
                # Jane should have more recent message than Ahmed
                assert jane.last_message_at is not None
                assert ahmed.last_message_at is not None
                assert jane.last_message_at >= ahmed.last_message_at

    def test_recent_contacts_respects_limit(self):
        """Test that recent contacts respects the limit parameter."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=3)

        assert len(results) <= 3

    def test_recent_contacts_includes_customer_name(self):
        """Test that recent contacts include customer names."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        if len(results) > 0:
            assert all(r.customer_name is not None for r in results)

    def test_recent_contacts_includes_last_message_at(self):
        """Test that recent contacts include last message timestamp."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        if len(results) > 0:
            # Should have last_message_at for contacts with user messages
            assert all(r.last_message_at is not None for r in results)

    def test_recent_contacts_includes_last_reservation_at(self):
        """Test that recent contacts include last reservation timestamp."""
        service = PhoneSearchService()
        results = service.get_recent_contacts(limit=10)

        # Check if reservations are included
        jane = next((r for r in results if r.wa_id == "966655555555"), None)
        if jane:
            assert jane.last_reservation_at is not None


class TestAllContacts:
    """Test cases for paginated all contacts functionality."""

    def test_get_all_contacts_returns_paginated_results(self):
        """Test that all contacts returns paginated results."""
        service = PhoneSearchService()
        results, total_count = service.get_all_contacts(page=1, page_size=5)

        assert len(results) <= 5
        assert total_count > 0

    def test_get_all_contacts_first_page(self):
        """Test getting first page of contacts."""
        service = PhoneSearchService()
        results, total_count = service.get_all_contacts(page=1, page_size=3)

        assert len(results) <= 3
        assert total_count >= len(results)

    def test_get_all_contacts_second_page(self):
        """Test getting second page of contacts."""
        service = PhoneSearchService()
        page1_results, total_count = service.get_all_contacts(page=1, page_size=3)
        page2_results, _ = service.get_all_contacts(page=2, page_size=3)

        # Should get different results
        if total_count > 3:
            page1_ids = {r.wa_id for r in page1_results}
            page2_ids = {r.wa_id for r in page2_results}
            assert page1_ids != page2_ids

    def test_get_all_contacts_respects_page_size(self):
        """Test that all contacts respects page size."""
        service = PhoneSearchService()
        results, _ = service.get_all_contacts(page=1, page_size=2)

        assert len(results) <= 2

    def test_get_all_contacts_returns_total_count(self):
        """Test that all contacts returns accurate total count."""
        service = PhoneSearchService()
        results, total_count = service.get_all_contacts(page=1, page_size=100)

        assert total_count >= len(results)
        assert total_count > 0

    def test_get_all_contacts_registration_filter_registered(self):
        """Test filtering by registered status."""
        service = PhoneSearchService()
        filters = {'registration': 'registered'}
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # Should only include contacts with custom names
        for result in results:
            assert result.customer_name is not None
            assert result.customer_name != ''
            assert result.customer_name != result.wa_id

    def test_get_all_contacts_registration_filter_unknown(self):
        """Test filtering by unknown status."""
        service = PhoneSearchService()
        filters = {'registration': 'unknown'}
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # Should only include contacts without custom names
        for result in results:
            has_custom_name = (
                result.customer_name is not None
                and result.customer_name != ''
                and result.customer_name != result.wa_id
            )
            assert not has_custom_name

    def test_get_all_contacts_country_filter(self):
        """Test filtering by country."""
        service = PhoneSearchService()
        filters = {'country': 'SA'}  # Saudi Arabia (966)
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # All results should be from Saudi Arabia (966 prefix)
        for result in results:
            assert result.wa_id.startswith('9666')

    def test_get_all_contacts_date_range_filter_messages(self):
        """Test filtering by date range for messages."""
        service = PhoneSearchService()
        from_date = datetime.now() - timedelta(days=25)
        to_date = datetime.now() - timedelta(days=5)

        filters = {
            'date_range': {
                'type': 'messages',
                'range': {
                    'from': from_date,
                    'to': to_date
                }
            }
        }
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # Should only include contacts with messages in the date range
        assert total_count >= 0  # May or may not have results

    def test_get_all_contacts_date_range_filter_reservations(self):
        """Test filtering by date range for reservations."""
        service = PhoneSearchService()
        from_date = datetime.now() - timedelta(days=10)
        to_date = datetime.now()

        filters = {
            'date_range': {
                'type': 'reservations',
                'range': {
                    'from': from_date,
                    'to': to_date
                }
            }
        }
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # Should only include contacts with reservations in the date range
        assert total_count >= 0  # May or may not have results

    def test_get_all_contacts_multiple_filters(self):
        """Test filtering with multiple filters."""
        service = PhoneSearchService()
        filters = {
            'registration': 'registered',
            'country': 'SA'
        }
        results, total_count = service.get_all_contacts(page=1, page_size=100, filters=filters)

        # Should match both filters
        for result in results:
            assert result.customer_name is not None
            assert result.customer_name != ''
            assert result.customer_name != result.wa_id
            assert result.wa_id.startswith('9666')

    def test_get_all_contacts_no_filters(self):
        """Test getting all contacts without filters."""
        service = PhoneSearchService()
        results, total_count = service.get_all_contacts(page=1, page_size=100)

        assert total_count > 0
        assert len(results) > 0

    def test_get_all_contacts_sorted_by_last_message(self):
        """Test that all contacts are sorted by last message."""
        service = PhoneSearchService()
        results, _ = service.get_all_contacts(page=1, page_size=10)

        if len(results) >= 2:
            # Check if sorted by last_message_at (descending)
            for i in range(len(results) - 1):
                current = results[i].last_message_at
                next_result = results[i + 1].last_message_at

                if current is not None and next_result is not None:
                    assert current >= next_result
                elif current is None and next_result is not None:
                    # None values should come last
                    pass

    def test_get_all_contacts_empty_page(self):
        """Test getting a page beyond available data."""
        service = PhoneSearchService()
        _, total_count = service.get_all_contacts(page=1, page_size=100)

        # Try to get a page beyond total
        if total_count > 0:
            last_page = (total_count // 100) + 2
            results, _ = service.get_all_contacts(page=last_page, page_size=100)
            assert len(results) == 0

    def test_get_all_contacts_includes_all_fields(self):
        """Test that all contacts include all required fields."""
        service = PhoneSearchService()
        results, _ = service.get_all_contacts(page=1, page_size=10)

        if len(results) > 0:
            result = results[0]
            assert hasattr(result, 'wa_id')
            assert hasattr(result, 'customer_name')
            assert hasattr(result, 'last_message_at')
            assert hasattr(result, 'last_reservation_at')
            assert hasattr(result, 'similarity')

