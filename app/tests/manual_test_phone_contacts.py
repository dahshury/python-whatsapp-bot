#!/usr/bin/env python3
"""
Manual test script for phone contacts endpoints.
Run this to verify the endpoints work correctly.
"""

import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.domain.customer.phone_search_service import PhoneSearchService


def test_recent_contacts():
    """Test recent contacts endpoint."""
    print("=" * 60)
    print("Testing get_recent_contacts()")
    print("=" * 60)

    service = PhoneSearchService()
    results = service.get_recent_contacts(limit=10)

    print(f"✓ Found {len(results)} recent contacts")

    if len(results) > 0:
        print("\nFirst 3 results:")
        for i, result in enumerate(results[:3], 1):
            print(f"  {i}. {result.wa_id} - {result.customer_name}")
            print(f"     Last message: {result.last_message_at}")
            print(f"     Last reservation: {result.last_reservation_at}")

    # Verify sorting
    if len(results) >= 2:
        print("\n✓ Verifying sort order...")
        for i in range(len(results) - 1):
            if results[i].last_message_at and results[i + 1].last_message_at:
                assert results[i].last_message_at >= results[i + 1].last_message_at, (
                    "Results not sorted by last message time"
                )
        print("✓ Results are correctly sorted by last message time (descending)")

    print("\n✓ Recent contacts test passed!\n")
    return True


def test_all_contacts():
    """Test all contacts pagination."""
    print("=" * 60)
    print("Testing get_all_contacts() - Pagination")
    print("=" * 60)

    service = PhoneSearchService()

    # Test first page
    page1_results, total_count = service.get_all_contacts(page=1, page_size=5)
    print(f"✓ Page 1: {len(page1_results)} contacts (total: {total_count})")

    # Test second page
    if total_count > 5:
        page2_results, _ = service.get_all_contacts(page=2, page_size=5)
        print(f"✓ Page 2: {len(page2_results)} contacts")

        # Verify different results
        page1_ids = {r.wa_id for r in page1_results}
        page2_ids = {r.wa_id for r in page2_results}
        assert page1_ids != page2_ids, "Page 1 and Page 2 should have different results"
        print("✓ Pages return different results")

    # Verify pagination respects page size
    assert len(page1_results) <= 5, "Page size exceeded"
    print("✓ Page size respected")

    print("\n✓ Pagination test passed!\n")
    return True


def test_all_contacts_filters():
    """Test all contacts with filters."""
    print("=" * 60)
    print("Testing get_all_contacts() - Filters")
    print("=" * 60)

    service = PhoneSearchService()

    # Test status filter - registered
    print("\nTesting status filter (registered)...")
    registered_results, registered_count = service.get_all_contacts(
        page=1, page_size=100, filters={"status": "registered"}
    )
    print(f"✓ Found {registered_count} registered contacts")

    # Verify all have custom names
    for result in registered_results[:5]:  # Check first 5
        assert result.customer_name is not None
        assert result.customer_name != ""
        assert result.customer_name != result.wa_id
    print("✓ All results have custom names")

    # Test status filter - unknown
    print("\nTesting status filter (unknown)...")
    unknown_results, unknown_count = service.get_all_contacts(
        page=1, page_size=100, filters={"status": "unknown"}
    )
    print(f"✓ Found {unknown_count} unknown contacts")
    # Test status filter - blocked
    print("\nTesting status filter (blocked)...")
    blocked_results, blocked_count = service.get_all_contacts(
        page=1, page_size=100, filters={"status": "blocked"}
    )
    print(f"✓ Found {blocked_count} blocked contacts")
    if blocked_results:
        for result in blocked_results[:5]:
            assert getattr(result, "is_blocked", False) is True
        print("✓ All sampled results are blocked")


    # Verify none have custom names
    for result in unknown_results[:5]:  # Check first 5
        has_custom_name = (
            result.customer_name is not None and result.customer_name != "" and result.customer_name != result.wa_id
        )
        assert not has_custom_name
    print("✓ All results lack custom names")

    # Test country filter
    print("\nTesting country filter (SA)...")
    country_results, country_count = service.get_all_contacts(page=1, page_size=100, filters={"country": "SA"})
    print(f"✓ Found {country_count} contacts from Saudi Arabia")

    # Verify all start with 966
    for result in country_results[:5]:  # Check first 5
        assert result.wa_id.startswith("966")
    print("✓ All results are from Saudi Arabia")

    # Test date range filter
    print("\nTesting date range filter (messages)...")
    from_date = datetime.now() - timedelta(days=30)
    to_date = datetime.now()

    date_results, date_count = service.get_all_contacts(
        page=1, page_size=100, filters={"date_range": {"type": "messages", "range": {"from": from_date, "to": to_date}}}
    )
    print(f"✓ Found {date_count} contacts with messages in date range")

    # Test multiple filters
    print("\nTesting multiple filters...")
    multi_results, multi_count = service.get_all_contacts(
        page=1, page_size=100, filters={"status": "registered", "country": "SA"}
    )
    print(f"✓ Found {multi_count} registered contacts from Saudi Arabia")

    print("\n✓ Filter tests passed!\n")
    return True


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("PHONE CONTACTS ENDPOINTS TEST SUITE")
    print("=" * 60 + "\n")

    try:
        test_recent_contacts()
        test_all_contacts()
        test_all_contacts_filters()

        print("=" * 60)
        print("ALL TESTS PASSED! ✓")
        print("=" * 60)
        return 0

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
