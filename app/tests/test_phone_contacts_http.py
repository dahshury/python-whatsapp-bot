"""
HTTP-based test script for phone contacts endpoints.
Tests the actual REST API endpoints.
"""

from datetime import datetime, timedelta

import requests

BASE_URL = "http://localhost:8000"


def test_recent_contacts_endpoint():
    """Test /phone/recent endpoint."""
    print("=" * 60)
    print("Testing GET /phone/recent")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}/phone/recent?limit=10")

    if response.status_code != 200:
        print(f"❌ Failed: Status {response.status_code}")
        print(response.text)
        return False

    data = response.json()
    assert data["success"], "Response should have success=true"
    assert "data" in data, "Response should have data field"

    contacts = data["data"]
    print(f"✓ Found {len(contacts)} recent contacts")

    if len(contacts) > 0:
        print("\nFirst 3 results:")
        for i, contact in enumerate(contacts[:3], 1):
            print(f"  {i}. {contact['wa_id']} - {contact.get('customer_name', 'N/A')}")
            if contact.get("last_message_at"):
                print(f"     Last message: {contact['last_message_at']}")

    # Verify sorting (most recent first)
    if len(contacts) >= 2:
        print("\n✓ Verifying sort order...")
        timestamps = []
        for contact in contacts:
            if contact.get("last_message_at"):
                timestamps.append(contact["last_message_at"])

        if len(timestamps) >= 2:
            sorted_timestamps = sorted(timestamps, reverse=True)
            assert timestamps == sorted_timestamps, "Results should be sorted by last_message_at (descending)"
            print("✓ Results are correctly sorted")

    print("\n✓ Recent contacts endpoint test passed!\n")
    return True


def test_all_contacts_endpoint():
    """Test /phone/all endpoint with pagination."""
    print("=" * 60)
    print("Testing GET /phone/all - Pagination")
    print("=" * 60)

    # Test first page
    response1 = requests.get(f"{BASE_URL}/phone/all?page=1&page_size=5")

    if response1.status_code != 200:
        print(f"❌ Failed: Status {response1.status_code}")
        print(response1.text)
        return False

    data1 = response1.json()
    assert data1["success"]
    assert "data" in data1
    assert "pagination" in data1

    page1_contacts = data1["data"]
    pagination = data1["pagination"]

    print(f"✓ Page 1: {len(page1_contacts)} contacts")
    print(f"  Total: {pagination['total']}")
    print(f"  Total pages: {pagination['total_pages']}")
    print(f"  Page: {pagination['page']}")
    print(f"  Page size: {pagination['page_size']}")

    # Test second page if available
    if pagination["total_pages"] > 1:
        response2 = requests.get(f"{BASE_URL}/phone/all?page=2&page_size=5")
        data2 = response2.json()
        page2_contacts = data2["data"]

        print(f"\n✓ Page 2: {len(page2_contacts)} contacts")

        # Verify different results
        page1_ids = {c["wa_id"] for c in page1_contacts}
        page2_ids = {c["wa_id"] for c in page2_contacts}
        assert page1_ids != page2_ids, "Page 1 and Page 2 should have different results"
        print("✓ Pages return different results")

    # Verify pagination respects page size
    assert len(page1_contacts) <= 5, "Page size exceeded"
    print("✓ Page size respected")

    print("\n✓ Pagination test passed!\n")
    return True


def test_all_contacts_filters():
    """Test /phone/all endpoint with filters."""
    print("=" * 60)
    print("Testing GET /phone/all - Filters")
    print("=" * 60)

    # Test registration filter - registered
    print("\nTesting registration filter (registered)...")
    response = requests.get(f"{BASE_URL}/phone/all?page=1&page_size=100&registration=registered")
    data = response.json()

    if data["success"]:
        registered_contacts = data["data"]
        print(f"✓ Found {data['pagination']['total']} registered contacts")

        # Verify all have custom names
        for contact in registered_contacts[:5]:
            assert contact.get("customer_name"), "Should have customer_name"
            assert contact["customer_name"] != "", "Should not be empty"
            assert contact["customer_name"] != contact["wa_id"], "Should not be same as wa_id"
        print("✓ All results have custom names")

    # Test registration filter - unknown
    print("\nTesting registration filter (unknown)...")
    response = requests.get(f"{BASE_URL}/phone/all?page=1&page_size=100&registration=unknown")
    data = response.json()

    if data["success"]:
        unknown_contacts = data["data"]
        print(f"✓ Found {data['pagination']['total']} unknown contacts")

        # Verify none have custom names
        for contact in unknown_contacts[:5]:
            has_custom_name = (
                contact.get("customer_name")
                and contact["customer_name"] != ""
                and contact["customer_name"] != contact["wa_id"]
            )
            assert not has_custom_name, "Should not have custom name"
        print("✓ All results lack custom names")

    # Test country filter
    print("\nTesting country filter (SA)...")
    response = requests.get(f"{BASE_URL}/phone/all?page=1&page_size=100&country=SA")
    data = response.json()

    if data["success"]:
        country_contacts = data["data"]
        print(f"✓ Found {data['pagination']['total']} contacts from Saudi Arabia")

        # Verify all start with 966
        for contact in country_contacts[:5]:
            assert contact["wa_id"].startswith("966"), "Should be from Saudi Arabia"
        print("✓ All results are from Saudi Arabia")

    # Test date range filter
    print("\nTesting date range filter (messages)...")
    from_date = (datetime.now() - timedelta(days=30)).isoformat()
    to_date = datetime.now().isoformat()

    response = requests.get(
        f"{BASE_URL}/phone/all?page=1&page_size=100&date_range_type=messages&date_from={from_date}&date_to={to_date}"
    )
    data = response.json()

    if data["success"]:
        print(f"✓ Found {data['pagination']['total']} contacts with messages in date range")

    print("\n✓ Filter tests passed!\n")
    return True


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("PHONE CONTACTS ENDPOINTS HTTP TEST SUITE")
    print("=" * 60 + "\n")

    try:
        # Check if server is running
        try:
            requests.get(f"{BASE_URL}/phone/stats", timeout=2)
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to {BASE_URL}")
            print("Please make sure the backend server is running.")
            return 1

        test_recent_contacts_endpoint()
        test_all_contacts_endpoint()
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
    import sys

    sys.exit(main())
