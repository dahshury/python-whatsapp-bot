"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Reservation } from "@/types/calendar";

export function useCalendarAgesBlocking(
	reservationsByUser: Record<string, Reservation[]>,
	timeoutMs = 1500,
): { agesByWaId: Record<string, number | null>; ready: boolean } {
	const [agesByWaId, setAgesByWaId] = useState<Record<string, number | null>>(
		{},
	);
	const [ready, setReady] = useState<boolean>(false);
	const doneRef = useRef<boolean>(false);

	const waIds = useMemo<string[]>(() => {
		return Object.keys(reservationsByUser || {})
			.map((k) => (k || "").trim())
			.filter(Boolean);
	}, [reservationsByUser]);

	useEffect(() => {
		if (!waIds.length) {
			setAgesByWaId({});
			setReady(true);
			return;
		}
		doneRef.current = false;

		const pending = new Set<string>(waIds);
		const result: Record<string, number | null> = {};

		const onProfile = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| { wa_id?: string; waId?: string; age?: number | null }
					| undefined;
				const wa = String(detail?.wa_id || detail?.waId || "").trim();
				if (!wa || !pending.has(wa)) return;
				const n = Number(detail?.age as unknown);
				const age = Number.isFinite(n) && n >= 10 && n <= 120 ? n : null;
				result[wa] = age;
				pending.delete(wa);
				if (!pending.size && !doneRef.current) {
					doneRef.current = true;
					setAgesByWaId({ ...result });
					setReady(true);
				}
			} catch {}
		};
		window.addEventListener(
			"documents:customerProfile",
			onProfile as EventListener,
		);

		// Send WS requests for all waIds
		try {
			const wsRef = (
				globalThis as unknown as {
					__wsConnection?: { current?: WebSocket };
				}
			).__wsConnection;
			const ws = wsRef?.current;
			if (ws && ws.readyState === WebSocket.OPEN) {
				for (const id of pending) {
					try {
						ws.send(
							JSON.stringify({ type: "get_customer", data: { wa_id: id } }),
						);
					} catch {}
				}
			}
		} catch {}

		// Hard timeout to avoid long waits; treat missing as null
		const t = setTimeout(
			() => {
				if (doneRef.current) return;
				doneRef.current = true;
				for (const id of pending) result[id] = null;
				pending.clear();
				setAgesByWaId({ ...result });
				setReady(true);
			},
			Math.max(200, timeoutMs),
		);

		return () => {
			window.removeEventListener(
				"documents:customerProfile",
				onProfile as EventListener,
			);
			clearTimeout(t);
		};
	}, [waIds, timeoutMs]);

	return { agesByWaId, ready };
}
