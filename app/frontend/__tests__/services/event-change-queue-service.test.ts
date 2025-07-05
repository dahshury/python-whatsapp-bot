/**
 * Unit Tests for EventChangeQueueService
 * Tests queue management, duplicate prevention, and sequential processing
 */

import { EventChangeQueueService } from "@/lib/services/event-change-queue-service";

describe("EventChangeQueueService", () => {
	let service: EventChangeQueueService;

	beforeEach(() => {
		service = new EventChangeQueueService();
	});

	afterEach(() => {
		// Clean up any pending operations
		jest.clearAllTimers();
	});

	describe("enqueue", () => {
		it("should process a single event change", async () => {
			const mockHandler = jest.fn().mockResolvedValue(undefined);
			const eventId = "test-event-1";

			await service.enqueue(eventId, mockHandler);

			expect(mockHandler).toHaveBeenCalledTimes(1);
		});

		it("should skip duplicate requests for the same event", async () => {
			const mockHandler1 = jest.fn().mockResolvedValue(undefined);
			const mockHandler2 = jest.fn().mockResolvedValue(undefined);
			const eventId = "test-event-1";

			// Start first request
			const promise1 = service.enqueue(eventId, mockHandler1);

			// Attempt second request for same event (should be skipped)
			const promise2 = service.enqueue(eventId, mockHandler2);

			await Promise.all([promise1, promise2]);

			expect(mockHandler1).toHaveBeenCalledTimes(1);
			expect(mockHandler2).toHaveBeenCalledTimes(0);
		});

		it("should process different events sequentially", async () => {
			const executionOrder: string[] = [];

			const mockHandler1 = jest.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				executionOrder.push("handler1");
			});

			const mockHandler2 = jest.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				executionOrder.push("handler2");
			});

			const promise1 = service.enqueue("event-1", mockHandler1);
			const promise2 = service.enqueue("event-2", mockHandler2);

			await Promise.all([promise1, promise2]);

			expect(mockHandler1).toHaveBeenCalledTimes(1);
			expect(mockHandler2).toHaveBeenCalledTimes(1);
			expect(executionOrder).toEqual(["handler1", "handler2"]);
		});

		it("should handle errors in handlers gracefully", async () => {
			const error = new Error("Test error");
			const mockHandler = jest.fn().mockRejectedValue(error);
			const eventId = "test-event-error";

			await expect(service.enqueue(eventId, mockHandler)).rejects.toThrow(
				"Test error",
			);
			expect(mockHandler).toHaveBeenCalledTimes(1);
		});
	});

	describe("getStats", () => {
		it("should return initial stats", () => {
			const stats = service.getStats();

			expect(stats).toEqual({
				queueLength: 0,
				processing: false,
				activeEvents: 0,
				processedTotal: 0,
				skippedTotal: 0,
			});
		});

		it("should track processed and skipped counts", async () => {
			const mockHandler = jest.fn().mockResolvedValue(undefined);
			const eventId = "test-event-1";

			// Process one event
			await service.enqueue(eventId, mockHandler);

			// Try to process same event again (should be skipped)
			await service.enqueue(eventId, jest.fn());

			const stats = service.getStats();

			expect(stats.processedTotal).toBe(1);
			expect(stats.skippedTotal).toBe(1);
		});
	});
});
