/**
 * Metrics Port (Domain-specific)
 * Defines the contract for metrics/monitoring operations.
 */

export type MetricsPort = {
  getMetrics(): Promise<PrometheusMetrics>;
  subscribe(callback: (metrics: PrometheusMetrics) => void): () => void;
};

export type PrometheusMetrics = Record<string, number>;
