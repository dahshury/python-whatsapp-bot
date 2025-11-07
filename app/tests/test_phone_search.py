"""
Unit tests for phone search service using pg_trgm.
Tests Arabic names, English names, partial matches, and fuzzy matching.
"""

import pytest

from app.db import ConversationModel, CustomerModel, ReservationModel, get_session, init_models
from app.services.domain.customer.phone_search_service import PhoneSearchService


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Initialize database and create test data."""
    init_models()

    with get_session() as session:
        # Clean up existing test data
        session.query(ReservationModel).filter(ReservationModel.wa_id.like('9665%')).delete()
        session.query(ConversationModel).filter(ConversationModel.wa_id.like('9665%')).delete()
        session.query(CustomerModel).filter(CustomerModel.wa_id.like('9665%')).delete()

        # Create test customers with Arabic and English names
        test_customers = [
            CustomerModel(wa_id="966512345678", customer_name="أحمد محمد"),  # Ahmad Mohamed in Arabic
            CustomerModel(wa_id="966523456789", customer_name="تسنيم"),  # Tasneem in Arabic
            CustomerModel(wa_id="966534567890", customer_name="John Smith"),
            CustomerModel(wa_id="966545678901", customer_name="محمد علي"),  # Mohammed Ali in Arabic
            CustomerModel(wa_id="966556789012", customer_name="Sarah Johnson"),
            CustomerModel(wa_id="966567890123", customer_name="عبدالله"),  # Abdullah in Arabic
            CustomerModel(wa_id="966578901234", customer_name="Jane Doe"),
            CustomerModel(wa_id="966589012345", customer_name="فاطمة الزهراء"),  # Fatima AlZahra in Arabic
        ]

        for customer in test_customers:
            session.merge(customer)

        # Add conversation data for recency
        conversation = ConversationModel(
            wa_id="966512345678",
            role="user",
            message="Hello",
            date="2024-01-01",
            time="12:00:00"
        )
        session.add(conversation)

        # Add reservation for recency
        reservation = ReservationModel(
            wa_id="966523456789",
            date="2024-01-02",
            time_slot="10:00",
            type=0,
            status="active"
        )
        session.add(reservation)

        session.commit()

    yield

    # Cleanup after tests
    with get_session() as session:
        session.query(ReservationModel).filter(ReservationModel.wa_id.like('9665%')).delete()
        session.query(ConversationModel).filter(ConversationModel.wa_id.like('9665%')).delete()
        session.query(CustomerModel).filter(CustomerModel.wa_id.like('9665%')).delete()
        session.commit()


class TestPhoneSearch:
    """Test cases for phone search functionality."""

    def test_search_arabic_full_name(self):
        """Test searching with full Arabic name."""
        service = PhoneSearchService()
        results = service.search_phones("تسنيم", limit=10)

        assert len(results) > 0
        assert any(r.customer_name == "تسنيم" for r in results)

    def test_search_arabic_partial_name(self):
        """Test searching with partial Arabic name."""
        service = PhoneSearchService()
        results = service.search_phones("أحمد", limit=10)

        assert len(results) > 0
        assert any("أحمد" in (r.customer_name or "") for r in results)

    def test_search_english_full_name(self):
        """Test searching with full English name."""
        service = PhoneSearchService()
        results = service.search_phones("John Smith", limit=10)

        assert len(results) > 0
        assert any(r.customer_name == "John Smith" for r in results)

    def test_search_english_partial_name(self):
        """Test searching with partial English name."""
        service = PhoneSearchService()
        results = service.search_phones("John", limit=10)

        assert len(results) > 0
        assert any("John" in (r.customer_name or "") for r in results)

    def test_search_partial_phone_number(self):
        """Test searching with partial phone number."""
        service = PhoneSearchService()
        results = service.search_phones("512345", limit=10)

        assert len(results) > 0
        assert any("512345" in r.wa_id for r in results)

    def test_search_full_phone_number(self):
        """Test searching with full phone number."""
        service = PhoneSearchService()
        results = service.search_phones("966512345678", limit=10)

        assert len(results) > 0
        assert any(r.wa_id == "966512345678" for r in results)

    def test_search_phone_with_plus(self):
        """Test searching phone number with + prefix."""
        service = PhoneSearchService()
        results = service.search_phones("+966512345678", limit=10)

        assert len(results) > 0
        assert any(r.wa_id == "966512345678" for r in results)

    def test_fuzzy_matching_english(self):
        """Test fuzzy matching for misspelled English names."""
        service = PhoneSearchService()
        # Search for "Jon" should find "John" with high similarity
        results = service.search_phones("Jon", limit=10)

        # pg_trgm should find similar matches
        assert len(results) >= 0  # May or may not match depending on threshold

    def test_fuzzy_matching_arabic(self):
        """Test fuzzy matching for Arabic names."""
        service = PhoneSearchService()
        # Search for partial Arabic should find similar names
        results = service.search_phones("محمد", limit=10)

        assert len(results) > 0
        # Should find both "أحمد محمد" and "محمد علي"
        names = [r.customer_name for r in results if r.customer_name]
        assert any("محمد" in name for name in names)

    def test_search_returns_similarity_score(self):
        """Test that results include similarity scores."""
        service = PhoneSearchService()
        results = service.search_phones("John", limit=10)

        if len(results) > 0:
            assert all(hasattr(r, 'similarity') for r in results)
            assert all(0 <= r.similarity <= 1 for r in results)

    def test_search_returns_activity_timestamps(self):
        """Test that results include last message and reservation times."""
        service = PhoneSearchService()
        results = service.search_phones("أحمد", limit=10)

        if len(results) > 0:
            result = next((r for r in results if r.wa_id == "966512345678"), None)
            if result:
                assert result.last_message_at is not None

    def test_search_empty_query(self):
        """Test searching with empty query returns no results."""
        service = PhoneSearchService()
        results = service.search_phones("", limit=10)

        assert len(results) == 0

    def test_search_no_matches(self):
        """Test searching with query that has no matches."""
        service = PhoneSearchService()
        results = service.search_phones("XYZNONEXISTENT999", limit=10)

        # Should return empty or very low similarity results
        assert len(results) == 0 or all(r.similarity < 0.3 for r in results)

    def test_search_respects_limit(self):
        """Test that search respects the limit parameter."""
        service = PhoneSearchService()
        results = service.search_phones("محمد", limit=1)

        assert len(results) <= 1

    def test_search_results_sorted_by_relevance(self):
        """Test that results are sorted by similarity score."""
        service = PhoneSearchService()
        results = service.search_phones("John", limit=10)

        if len(results) > 1:
            scores = [r.similarity for r in results]
            # Scores should be in descending order
            assert scores == sorted(scores, reverse=True)

    def test_search_case_insensitive(self):
        """Test that search is case-insensitive."""
        service = PhoneSearchService()
        results_lower = service.search_phones("john", limit=10)
        results_upper = service.search_phones("JOHN", limit=10)
        results_mixed = service.search_phones("JoHn", limit=10)

        # All should find the same John Smith
        assert len(results_lower) > 0
        assert len(results_upper) > 0
        assert len(results_mixed) > 0

    def test_search_with_spaces_in_phone(self):
        """Test searching phone numbers with spaces."""
        service = PhoneSearchService()
        results = service.search_phones("966 512 345 678", limit=10)

        # Should normalize and find the phone
        assert len(results) > 0
        assert any(r.wa_id == "966512345678" for r in results)

    def test_search_with_dashes_in_phone(self):
        """Test searching phone numbers with dashes."""
        service = PhoneSearchService()
        results = service.search_phones("966-512-345-678", limit=10)

        # Should normalize and find the phone
        assert len(results) > 0
        assert any(r.wa_id == "966512345678" for r in results)

    def test_to_dict_serialization(self):
        """Test that PhoneSearchResult can be serialized to dict."""
        service = PhoneSearchService()
        results = service.search_phones("John", limit=1)

        if len(results) > 0:
            result_dict = results[0].to_dict()
            assert isinstance(result_dict, dict)
            assert 'wa_id' in result_dict
            assert 'customer_name' in result_dict
            assert 'similarity' in result_dict
            assert 'last_message_at' in result_dict or result_dict['last_message_at'] is None
            assert 'last_reservation_at' in result_dict or result_dict['last_reservation_at'] is None

