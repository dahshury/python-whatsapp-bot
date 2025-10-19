import { z } from "zod";

// Prometheus-like numeric metrics map
export const zMetrics = z.record(z.number());

export type Metrics = z.infer<typeof zMetrics>;
