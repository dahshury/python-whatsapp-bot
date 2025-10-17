"use client";

import { useReservationsData } from "@shared/libs/data/websocket-data-provider";
import React from "react";

export function useResolveCustomerName() {
	const { reservations } = useReservationsData();

	return React.useCallback(
		(waId?: string, fallbackName?: string): string | undefined => {
			try {
				if (fallbackName && String(fallbackName).trim()) {
					return String(fallbackName);
				}
				const id = String(waId || "");
				if (!id) {
					return;
				}
				const list =
					(
						reservations as
							| Record<string, Array<{ customer_name?: string }>>
							| undefined
					)?.[id] ?? [];
				for (const r of list) {
					if (r?.customer_name) {
						return String(r.customer_name);
					}
				}
			} catch {
				// Ignore errors when resolving customer name from reservations
			}
			return;
		},
		[reservations]
	);
}
