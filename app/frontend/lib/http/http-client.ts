import { callPythonBackend } from "@/lib/backend";

type Json = Record<string, unknown> | unknown[] | null;

async function get<T = unknown>(path: string): Promise<T> {
  return (await callPythonBackend(path, { method: "GET" })) as T;
}

async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  return (await callPythonBackend(path, {
    method: "POST",
    body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
  })) as T;
}

async function put<T = unknown>(path: string, body?: unknown): Promise<T> {
  return (await callPythonBackend(path, {
    method: "PUT",
    body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
  })) as T;
}

export const httpClient = { get, post, put };

export type { Json };


