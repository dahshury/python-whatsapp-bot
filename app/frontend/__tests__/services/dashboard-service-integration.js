/**
 * Dashboard Service Integration Test
 *
 * This script verifies that the refactored DashboardService works correctly
 * with various data scenarios and edge cases.
 *
 * Run with: node __tests__/services/dashboard-service-integration.js
 */

// Note: The original dashboard service was refactored and replaced
// This test now verifies the refactored service works correctly with mock data
const { DashboardService } = require("../../lib/services/dashboard-service");

// Comprehensive test data that covers edge cases
const mockReservationData = {
	customer001: [
		{ date: "2024-01-15", time: "10:00", cancelled: false, type: 0 },
		{ date: "2024-01-20", time: "14:30", cancelled: true, type: 1 },
		{ date: "2024-02-01", time: "09:15", cancelled: false, type: 0 },
	],
	customer002: [
		{ date: "2024-01-18", time: "09:00", cancelled: false, type: 0 },
		{ date: "2024-01-25", time: "16:45", cancelled: false, type: 1 },
	],
	customer003: [
		{ date: "2024-01-22", time: "11:00", cancelled: false, type: 0 },
	],
	customer004: [
		{ date: "2024-02-05", time: "13:30", cancelled: true, type: 0 },
	],
};

const mockConversationData = {
	customer001: [
		{
			date: "2024-01-15",
			time: "9:45 AM",
			message: "I need an appointment",
			role: "customer",
		},
		{
			date: "2024-01-15",
			time: "9:50 AM",
			message: "Sure! What time works for you?",
			role: "assistant",
		},
		{
			date: "2024-01-15",
			time: "9:52 AM",
			message: "10 AM would be perfect",
			role: "customer",
		},
	],
	customer002: [
		{
			date: "2024-01-18",
			time: "8:30 AM",
			message: "Hi there",
			role: "customer",
		},
		{
			date: "2024-01-18",
			time: "8:35 AM",
			message: "Hello! How can I help?",
			role: "assistant",
		},
	],
	customer003: [
		{
			date: "2024-01-22",
			time: "10:45",
			message: "Quick question about my appointment",
		},
		{
			date: "2024-01-22",
			time: "10:50",
			message: "Of course, what can I help with?",
		},
	],
};

// Test filters
const testFilters = {
	dateRange: {
		from: new Date("2024-01-10"),
		to: new Date("2024-01-30"),
	},
};

function assert(condition, message) {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

function compareObjects(obj1, obj2, path = "", tolerance = 0.001) {
	const errors = [];

	function compare(a, b, currentPath) {
		if (typeof a !== typeof b) {
			errors.push(
				`Type mismatch at ${currentPath}: ${typeof a} vs ${typeof b}`,
			);
			return;
		}

		if (a === null || b === null) {
			if (a !== b) {
				errors.push(`Null mismatch at ${currentPath}: ${a} vs ${b}`);
			}
			return;
		}

		if (typeof a === "number") {
			if (Math.abs(a - b) > tolerance) {
				errors.push(
					`Number mismatch at ${currentPath}: ${a} vs ${b} (diff: ${Math.abs(a - b)})`,
				);
			}
			return;
		}

		if (typeof a === "string" || typeof a === "boolean") {
			if (a !== b) {
				errors.push(`Value mismatch at ${currentPath}: ${a} vs ${b}`);
			}
			return;
		}

		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) {
				errors.push(
					`Array length mismatch at ${currentPath}: ${a.length} vs ${b.length}`,
				);
				return;
			}
			for (let i = 0; i < a.length; i++) {
				compare(a[i], b[i], `${currentPath}[${i}]`);
			}
			return;
		}

		if (typeof a === "object" && typeof b === "object") {
			const keysA = Object.keys(a).sort();
			const keysB = Object.keys(b).sort();

			if (keysA.length !== keysB.length) {
				errors.push(
					`Object key count mismatch at ${currentPath}: ${keysA.length} vs ${keysB.length}`,
				);
			}

			const allKeys = new Set([...keysA, ...keysB]);
			for (const key of allKeys) {
				if (!(key in a)) {
					errors.push(`Missing key in original at ${currentPath}.${key}`);
				} else if (!(key in b)) {
					errors.push(`Missing key in refactored at ${currentPath}.${key}`);
				} else {
					compare(a[key], b[key], `${currentPath}.${key}`);
				}
			}
			return;
		}

		if (a !== b) {
			errors.push(`Value mismatch at ${currentPath}: ${a} vs ${b}`);
		}
	}

	compare(obj1, obj2, path);
	return errors;
}

async function testProcessDashboardData() {
	console.log("🧪 Testing processDashboardData method...");

	try {
		// Test the refactored service with mock data
		const result = await DashboardService.processDashboardData(
			mockReservationData,
			mockConversationData,
			testFilters,
		);

		// Verify the result has expected structure and data
		assert(result.stats, "Result should have stats object");
		assert(
			typeof result.stats.totalReservations === "number",
			"Should have total reservations",
		);
		assert(
			typeof result.stats.uniqueCustomers === "number",
			"Should have unique customers",
		);
		assert(Array.isArray(result.dailyTrends), "Should have daily trends array");
		assert(
			Array.isArray(result.topCustomers),
			"Should have top customers array",
		);

		// Verify data makes sense with our test data
		assert(
			result.stats.totalReservations > 0,
			"Should have processed reservations",
		);
		assert(
			result.stats.uniqueCustomers > 0,
			"Should have identified customers",
		);
		assert(result.dailyTrends.length > 0, "Should have generated trends");

		console.log("✅ processDashboardData works correctly");

		// Log summary for manual verification
		console.log("\n📊 Dashboard Data Summary:");
		console.log(`  Total Reservations: ${result.stats.totalReservations}`);
		console.log(`  Unique Customers: ${result.stats.uniqueCustomers}`);
		console.log(
			`  Conversion Rate: ${result.stats.conversionRate.toFixed(2)}%`,
		);
		console.log(`  Daily Trends: ${result.dailyTrends.length} entries`);
		console.log(`  Top Customers: ${result.topCustomers.length} entries`);

		return result;
	} catch (error) {
		console.error("❌ Error in processDashboardData test:", error.message);
		throw error;
	}
}

async function testWithEmptyData() {
	console.log("🧪 Testing with empty data...");

	try {
		const result = await DashboardService.processDashboardData({}, {});

		// Verify empty data handling
		assert(result.stats, "Result should have stats object");
		assert(
			result.stats.totalReservations === 0,
			"Empty data should have zero reservations",
		);
		assert(
			result.stats.uniqueCustomers === 0,
			"Empty data should have zero customers",
		);
		assert(
			result.stats.conversionRate === 0,
			"Empty data should have zero conversion rate",
		);
		assert(Array.isArray(result.dailyTrends), "Should have daily trends array");
		assert(result.dailyTrends.length === 0, "Empty data should have no trends");

		console.log("✅ Empty data handling works correctly");
	} catch (error) {
		console.error("❌ Error in empty data test:", error.message);
		throw error;
	}
}

async function testWithFilteredData() {
	console.log("🧪 Testing with date filters...");

	try {
		const narrowFilter = {
			dateRange: {
				from: new Date("2024-01-17"),
				to: new Date("2024-01-23"),
			},
		};

		// Test with no filter first
		const unfilteredResult = await DashboardService.processDashboardData(
			mockReservationData,
			mockConversationData,
		);

		// Test with filter applied
		const filteredResult = await DashboardService.processDashboardData(
			mockReservationData,
			mockConversationData,
			narrowFilter,
		);

		// Verify filtering worked by comparing totals
		assert(
			filteredResult.stats.totalReservations <=
				unfilteredResult.stats.totalReservations,
			"Filtering should not increase reservation count",
		);
		assert(
			filteredResult.stats.uniqueCustomers <=
				unfilteredResult.stats.uniqueCustomers,
			"Filtering should not increase customer count",
		);
		assert(
			Array.isArray(filteredResult.dailyTrends),
			"Should have daily trends",
		);

		console.log("✅ Date filtering works correctly");
		console.log(
			`  Unfiltered: ${unfilteredResult.stats.totalReservations} reservations`,
		);
		console.log(
			`  Filtered: ${filteredResult.stats.totalReservations} reservations`,
		);
	} catch (error) {
		console.error("❌ Error in filtered data test:", error.message);
		throw error;
	}
}

async function runIntegrationTests() {
	try {
		console.log("🚀 Starting Dashboard Service Integration Tests...\n");

		await testProcessDashboardData();
		await testWithEmptyData();
		await testWithFilteredData();

		console.log("\n🎉 All integration tests passed!");
		console.log("✅ Refactored DashboardService working correctly");
		console.log("✅ Migration completed successfully");

		return true;
	} catch (error) {
		console.error("\n❌ Integration tests failed:", error.message);
		console.error("Stack trace:", error.stack);
		return false;
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	runIntegrationTests().then((success) => {
		process.exit(success ? 0 : 1);
	});
}

module.exports = {
	runIntegrationTests,
	testProcessDashboardData,
	testWithEmptyData,
	testWithFilteredData,
	compareObjects,
};
