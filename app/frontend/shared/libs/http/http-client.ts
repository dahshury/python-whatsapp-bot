import type { SchemaLike } from "@shared/libs/backend";
import { callPythonBackend } from "@shared/libs/backend";

type Json = Record<string, unknown> | unknown[] | null;

async function get<T = unknown>(
	path: string,
	schema?: SchemaLike<T>
): Promise<T> {
	if (schema) {
		return await callPythonBackend(path, { method: "GET" }, schema);
	}
	return (await callPythonBackend(path, { method: "GET" })) as T;
}

async function post<T = unknown>(
	path: string,
	body?: unknown,
	schema?: SchemaLike<T>
): Promise<T> {
	const init = {
		method: "POST",
		body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
	} as const;
	if (schema) {
		return await callPythonBackend(path, init, schema);
	}
	return (await callPythonBackend(path, init)) as T;
}

async function put<T = unknown>(
	path: string,
	body?: unknown,
	schema?: SchemaLike<T>
): Promise<T> {
	const init = {
		method: "PUT",
		body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
	} as const;
	if (schema) {
		return await callPythonBackend(path, init, schema);
	}
	return (await callPythonBackend(path, init)) as T;
}

export const httpClient = { get, post, put };

export type { Json };
