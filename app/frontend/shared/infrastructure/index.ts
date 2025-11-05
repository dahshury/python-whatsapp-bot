/**
 * Shared Infrastructure Layer Public API
 * Exports infrastructure implementations (adapters, providers, etc.)
 */

export type { ServiceRegistry } from "@/infrastructure/providers/app-service-provider";
export {
  AppServiceProvider,
  useChatPort,
  useHttpPort,
  useMetricsPort,
  useReservationsPort,
  useServices,
  useWebSocketPort,
} from "@/infrastructure/providers/app-service-provider";
export { StoreProvider } from "@/infrastructure/providers/store-provider";
export {
  HttpAdapter,
  httpAdapter,
  WebSocketAdapter,
  wsAdapter,
} from "./adapters";
