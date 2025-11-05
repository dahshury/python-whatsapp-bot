/**
 * HTTP Adapter
 * Implements HttpClientPort using the existing callPythonBackend client.
 * This adapter provides the concrete implementation of the HTTP communication port.
 */

import { callPythonBackend } from "@/shared/libs/backend";
import type { HttpClientPort } from "@/shared/ports";

export class HttpAdapter implements HttpClientPort {
  async get<T = unknown>(path: string): Promise<T> {
    return await callPythonBackend<T>(path, { method: "GET" });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await callPythonBackend<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : null,
    });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await callPythonBackend<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : null,
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return await callPythonBackend<T>(path, { method: "DELETE" });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await callPythonBackend<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : null,
    });
  }
}

// Singleton instance
export const httpAdapter = new HttpAdapter();
