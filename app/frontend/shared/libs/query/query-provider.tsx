"use client";

import { applyQueryDefaults } from "@shared/libs/query/query-defaults";
import { enableQueryPersistence } from "@shared/libs/query/query-persist";
import { devGroup, devGroupEnd, devLog } from "@shared/libs/utils/dev-logger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { PropsWithChildren } from "react";
import React, { useEffect } from "react";

let singletonClient: QueryClient | null = null;

function getQueryClient(): QueryClient {
	if (singletonClient) {
		return singletonClient;
	}
	singletonClient = new QueryClient();
	applyQueryDefaults(singletonClient);

	return singletonClient;
}

export function QueryProvider({ children }: PropsWithChildren) {
	const clientRef = React.useRef<QueryClient | null>(null);
	if (!clientRef.current) {
		clientRef.current = getQueryClient();
	}
	// Enable persistence on client only
	useEffect(() => {
		if (clientRef.current) {
			enableQueryPersistence(clientRef.current);
		}
	}, []);

	// Dev-only: subscribe to Query Cache and log state transitions
	useEffect(() => {
		const client = clientRef.current;
		if (!client) {
			return () => {
				/* noop */
			};
		}
		const unsubscribe = client.getQueryCache().subscribe((event: unknown) => {
			try {
				const e = event as {
					type?: string;
					query?: {
						queryKey?: unknown[];
						state?: {
							status?: string;
							fetchStatus?: string;
							dataUpdatedAt?: number;
						};
					};
				};
				if (e?.query?.queryKey) {
					const key = (e.query.queryKey || []) as unknown[];
					devGroup("RQ cache event");
					devLog("type", e?.type || "");
					devLog("key", key);
					devLog("status", e?.query?.state?.status || "");
					devLog("fetchStatus", e?.query?.state?.fetchStatus || "");
					devLog("dataUpdatedAt", e?.query?.state?.dataUpdatedAt || 0);
					devGroupEnd();
				}
			} catch {
				// ignore logging errors
			}
		});
		return () => unsubscribe();
	}, []);
	const ReactQueryDevtools = dynamic(
		async () =>
			(await import("@tanstack/react-query-devtools")).ReactQueryDevtools,
		{ ssr: false, loading: () => null }
	);
	return (
		<QueryClientProvider client={clientRef.current}>
			{children}
			{process.env.NODE_ENV !== "production" ? (
				<ReactQueryDevtools initialIsOpen={false} />
			) : null}
		</QueryClientProvider>
	);
}
