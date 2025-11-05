/**
 * HTTP Client Port (Hexagonal Architecture)
 * Defines the contract for HTTP communication independent of implementation.
 */

export type HttpClientPort = {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
};
