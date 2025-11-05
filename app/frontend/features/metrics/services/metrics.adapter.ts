import { httpAdapter } from "@/shared/infrastructure";
import type {
  MetricsPort,
  PrometheusMetrics,
  WebSocketPort,
} from "@/shared/ports";

const METRICS_TIMEOUT_MS = 5000;

export class MetricsAdapter implements MetricsPort {
  private readonly wsPort: WebSocketPort;

  constructor(wsPort: WebSocketPort) {
    this.wsPort = wsPort;
  }

  async getMetrics(): Promise<PrometheusMetrics> {
    const wsOk = await this.wsPort.send({ type: "metrics_get", data: {} });
    if (wsOk) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Metrics fetch timeout")),
          METRICS_TIMEOUT_MS
        );
        const unsubscribe = this.wsPort.subscribe((message) => {
          if (message.type === "metrics_data") {
            clearTimeout(timeout);
            unsubscribe();
            resolve((message.data as PrometheusMetrics) || {});
          } else if (message.type === "metrics_error") {
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error("Failed to fetch metrics"));
          }
        });
      });
    }
    return await httpAdapter.get<PrometheusMetrics>("/api/metrics");
  }

  subscribe(callback: (metrics: PrometheusMetrics) => void): () => void {
    const unsubscribe = this.wsPort.subscribe((message) => {
      if (message.type === "metrics_data") {
        callback((message.data as PrometheusMetrics) || {});
      }
    });
    return unsubscribe;
  }
}
