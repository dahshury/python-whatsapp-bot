import {
	type CallPythonBackendOptions,
	callPythonBackend,
} from '@/shared/libs/backend'

export type ApiResponse<T> = { data?: T; success?: boolean; message?: string }

export class ApiClient {
	async get<T = unknown>(
		path: string,
		options?: CallPythonBackendOptions
	): Promise<ApiResponse<T>> {
		return (await callPythonBackend(
			path,
			{ method: 'GET' },
			options
		)) as ApiResponse<T>
	}

	async post<T = unknown>(
		path: string,
		body?: unknown,
		options?: CallPythonBackendOptions
	): Promise<ApiResponse<T>> {
		return (await callPythonBackend(
			path,
			{
				method: 'POST',
				body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
			},
			options
		)) as ApiResponse<T>
	}

	async put<T = unknown>(
		path: string,
		body?: unknown,
		options?: CallPythonBackendOptions
	): Promise<ApiResponse<T>> {
		return (await callPythonBackend(
			path,
			{
				method: 'PUT',
				body: body !== undefined ? (JSON.stringify(body) as BodyInit) : null,
			},
			options
		)) as ApiResponse<T>
	}
}

export const apiClient = new ApiClient()
