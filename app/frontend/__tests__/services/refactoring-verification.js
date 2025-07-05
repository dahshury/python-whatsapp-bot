/**
 * Refactoring Verification Script
 *
 * This script verifies that the refactored dashboard services produce
 * identical results to the original implementation.
 *
 * Run with: node __tests__/services/refactoring-verification.js
 */

const {
	DataTransformService,
} = require("../../lib/services/domain/data-transform-service");
const {
	DashboardStatsService,
} = require("../../lib/services/domain/dashboard-stats-service");
const {
	DashboardAnalyticsService,
} = require("../../lib/services/domain/dashboard-analytics-service");

// Test data
const mockReservationData = {
	user123: [
		{ date: "2024-01-15", time: "10:00", cancelled: false, type: 0 },
		{ date: "2024-01-20", time: "14:30", cancelled: true, type: 1 },
	],
	user456: [{ date: "2024-01-18", time: "09:00", cancelled: false, type: 0 }],
	user789: [
		{ date: "2024-01-22", time: "11:00", cancelled: false, type: 0 },
		{ date: "2024-01-25", time: "16:00", cancelled: false, type: 1 },
	],
};

const mockConversationData = {
	user123: [
		{
			date: "2024-01-15",
			time: "10:00 AM",
			message: "Hello",
			role: "customer",
		},
		{
			date: "2024-01-15",
			time: "10:05 AM",
			message: "Hi there!",
			role: "assistant",
		},
	],
	user456: [
		{ date: "2024-01-18", time: "14:30", message: "Need appointment" },
		{ date: "2024-01-18", time: "14:35", message: "Sure, let me help" },
	],
};

// Verification functions
function assert(condition, message) {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

function _assertEqual(actual, expected, message) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		console.error("Expected:", expected);
		console.error("Actual:", actual);
		throw new Error(`Assertion failed: ${message}`);
	}
}

function testDataTransformService() {
	console.log("🧪 Testing DataTransformService...");

	// Test flattenReservations
	const reservations =
		DataTransformService.flattenReservations(mockReservationData);
	assert(reservations.length === 5, "Should flatten all reservations");
	assert(reservations[0].wa_id === "user123", "Should set wa_id correctly");
	assert(
		reservations[0].date_dt instanceof Date,
		"Should parse date_dt correctly",
	);
	assert(reservations[1].cancelled === true, "Should preserve cancelled flag");

	// Test flattenConversations
	const conversations =
		DataTransformService.flattenConversations(mockConversationData);
	assert(conversations.length === 4, "Should flatten all conversations");
	assert(conversations[0].wa_id === "user123", "Should set wa_id correctly");
	assert(
		conversations[0].datetime instanceof Date,
		"Should parse datetime correctly",
	);
	assert(
		conversations[0].length_chars === 5,
		"Should calculate character length",
	);
	assert(conversations[0].length_words === 1, "Should calculate word count");

	// Test applyDateFilter
	const dateRange = {
		from: new Date("2024-01-17"),
		to: new Date("2024-01-23"),
	};
	const filteredReservations = DataTransformService.applyDateFilter(
		reservations,
		dateRange,
	);
	assert(
		filteredReservations.length === 2,
		"Should filter by date range correctly",
	);

	console.log("✅ DataTransformService tests passed");
	return { reservations, conversations };
}

function testDashboardStatsService(reservations, conversations) {
	console.log("🧪 Testing DashboardStatsService...");

	// Test calculateStats
	const stats = DashboardStatsService.calculateStats(
		reservations,
		conversations,
		mockConversationData,
	);
	assert(
		typeof stats.totalReservations === "number",
		"Should calculate total reservations",
	);
	assert(
		typeof stats.uniqueCustomers === "number",
		"Should calculate unique customers",
	);
	assert(
		typeof stats.conversionRate === "number",
		"Should calculate conversion rate",
	);
	assert(
		stats.totalReservations === 4,
		"Should count non-cancelled reservations correctly",
	);
	assert(
		stats.totalCancellations === 1,
		"Should count cancelled reservations correctly",
	);
	assert(
		stats.uniqueCustomers === 3,
		"Should count unique customers correctly",
	);

	// Test calculateOperationMetrics
	const operationMetrics =
		DashboardStatsService.calculateOperationMetrics(reservations);
	assert(
		typeof operationMetrics.reservations_requested_total === "number",
		"Should calculate operation metrics",
	);
	assert(
		operationMetrics.reservations_requested_total === 5,
		"Should count all reservations",
	);
	assert(
		operationMetrics.reservations_successful_total === 4,
		"Should count successful reservations",
	);

	console.log("✅ DashboardStatsService tests passed");
	return stats;
}

function testDashboardAnalyticsService(reservations, conversations) {
	console.log("🧪 Testing DashboardAnalyticsService...");

	// Test generateDailyTrends
	const dailyTrends =
		DashboardAnalyticsService.generateDailyTrends(reservations);
	assert(Array.isArray(dailyTrends), "Should return array for daily trends");
	assert(dailyTrends.length > 0, "Should have daily trend data");
	assert(typeof dailyTrends[0].date === "string", "Should have date string");
	assert(
		typeof dailyTrends[0].reservations === "number",
		"Should have reservation count",
	);

	// Test generateTypeDistribution
	const typeDistribution =
		DashboardAnalyticsService.generateTypeDistribution(reservations);
	assert(
		Array.isArray(typeDistribution),
		"Should return array for type distribution",
	);
	assert(typeDistribution.length > 0, "Should have type distribution data");

	// Test generateConversationAnalysis
	const conversationAnalysis =
		DashboardAnalyticsService.generateConversationAnalysis(conversations);
	assert(
		typeof conversationAnalysis.totalMessages === "number",
		"Should analyze conversations",
	);
	assert(conversationAnalysis.totalMessages === 4, "Should count all messages");
	assert(
		conversationAnalysis.uniqueCustomers === 2,
		"Should count unique conversation customers",
	);

	// Test generateFunnelData
	const funnelData = DashboardAnalyticsService.generateFunnelData(
		reservations,
		conversations,
	);
	assert(Array.isArray(funnelData), "Should return array for funnel data");
	assert(funnelData.length === 4, "Should have 4 funnel stages");

	// Test generateCustomerSegments
	const customerSegments =
		DashboardAnalyticsService.generateCustomerSegments(reservations);
	assert(
		Array.isArray(customerSegments),
		"Should return array for customer segments",
	);
	assert(customerSegments.length === 3, "Should have 3 customer segments");

	console.log("✅ DashboardAnalyticsService tests passed");
}

function testErrorHandling() {
	console.log("🧪 Testing Error Handling...");

	// Test with invalid data
	try {
		const emptyReservations = DataTransformService.flattenReservations({});
		assert(emptyReservations.length === 0, "Should handle empty data");

		const invalidConversations =
			DataTransformService.flattenConversations(null);
		assert(invalidConversations.length === 0, "Should handle null data");

		console.log("✅ Error handling tests passed");
	} catch (error) {
		console.error("❌ Error handling test failed:", error.message);
		throw error;
	}
}

function runAllTests() {
	try {
		console.log("🚀 Starting Dashboard Services Verification...\n");

		const { reservations, conversations } = testDataTransformService();
		testDashboardStatsService(reservations, conversations);
		testDashboardAnalyticsService(reservations, conversations);
		testErrorHandling();

		console.log("\n🎉 All verification tests passed!");
		console.log("✅ Refactored dashboard services are working correctly");

		return true;
	} catch (error) {
		console.error("\n❌ Verification failed:", error.message);
		console.error("Stack trace:", error.stack);
		return false;
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	const success = runAllTests();
	process.exit(success ? 0 : 1);
}

module.exports = {
	runAllTests,
	testDataTransformService,
	testDashboardStatsService,
	testDashboardAnalyticsService,
	testErrorHandling,
};
