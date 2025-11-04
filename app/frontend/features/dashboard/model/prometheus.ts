import type { PrometheusMetrics } from '@/features/dashboard/types'

export function normalizePrometheusMetrics(
	prom: PrometheusMetrics | undefined
): PrometheusMetrics {
	const src = prom || {}
	return {
		...(typeof (src as { process_cpu_percent?: number }).process_cpu_percent ===
			'number' && {
			cpu_percent: (src as { process_cpu_percent?: number })
				.process_cpu_percent,
		}),
		...(typeof (src as { cpu_percent?: number }).cpu_percent === 'number' && {
			cpu_percent: (src as { cpu_percent?: number }).cpu_percent,
		}),
		...(typeof (src as { process_memory_bytes?: number })
			.process_memory_bytes === 'number' && {
			memory_bytes: (src as { process_memory_bytes?: number })
				.process_memory_bytes,
		}),
		...(typeof (src as { memory_bytes?: number }).memory_bytes === 'number' && {
			memory_bytes: (src as { memory_bytes?: number }).memory_bytes,
		}),
		...(typeof (src as { reservations_requested_total?: number })
			.reservations_requested_total === 'number' && {
			reservations_requested_total: (
				src as { reservations_requested_total?: number }
			).reservations_requested_total,
		}),
		...(typeof (src as { reservations_successful_total?: number })
			.reservations_successful_total === 'number' && {
			reservations_successful_total: (
				src as { reservations_successful_total?: number }
			).reservations_successful_total,
		}),
		...(typeof (src as { reservations_failed_total?: number })
			.reservations_failed_total === 'number' && {
			reservations_failed_total: (src as { reservations_failed_total?: number })
				.reservations_failed_total,
		}),
		...(typeof (src as { reservations_cancellation_requested_total?: number })
			.reservations_cancellation_requested_total === 'number' && {
			reservations_cancellation_requested_total: (
				src as { reservations_cancellation_requested_total?: number }
			).reservations_cancellation_requested_total,
		}),
		...(typeof (src as { reservations_cancellation_successful_total?: number })
			.reservations_cancellation_successful_total === 'number' && {
			reservations_cancellation_successful_total: (
				src as { reservations_cancellation_successful_total?: number }
			).reservations_cancellation_successful_total,
		}),
		...(typeof (src as { reservations_cancellation_failed_total?: number })
			.reservations_cancellation_failed_total === 'number' && {
			reservations_cancellation_failed_total: (
				src as { reservations_cancellation_failed_total?: number }
			).reservations_cancellation_failed_total,
		}),
		...(typeof (src as { reservations_modification_requested_total?: number })
			.reservations_modification_requested_total === 'number' && {
			reservations_modification_requested_total: (
				src as { reservations_modification_requested_total?: number }
			).reservations_modification_requested_total,
		}),
		...(typeof (src as { reservations_modification_successful_total?: number })
			.reservations_modification_successful_total === 'number' && {
			reservations_modification_successful_total: (
				src as { reservations_modification_successful_total?: number }
			).reservations_modification_successful_total,
		}),
		...(typeof (src as { reservations_modification_failed_total?: number })
			.reservations_modification_failed_total === 'number' && {
			reservations_modification_failed_total: (
				src as { reservations_modification_failed_total?: number }
			).reservations_modification_failed_total,
		}),
	}
}
