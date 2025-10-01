"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Reservation } from "@/types/calendar";

type AgeRegistry = {
	ageByWaId: Map<string, number | null>;
	hasAge: (waId: string) => boolean;
	setAge: (waId: string, age: number | null) => void;
};

declare global {
	// eslint-disable-next-line no-var
	var __customerAgeRegistry: AgeRegistry | undefined;
}

function getOrInitRegistry(): AgeRegistry {
	if (globalThis.__customerAgeRegistry) return globalThis.__customerAgeRegistry;
	const ageByWaId = new Map<string, number | null>();

	// Seed from sessionStorage cache for instant first-paint indicators
	try {
		const raw = sessionStorage.getItem("customerAges");
		if (raw) {
			const obj = JSON.parse(raw) as Record<string, number | null>;
			for (const [k, v] of Object.entries(obj || {})) {
				const key = (k || "").trim();
				if (!key) continue;
				const n = typeof v === "number" ? v : null;
				ageByWaId.set(key, n);
			}
		}
	} catch {}
	const reg: AgeRegistry = {
		ageByWaId,
		hasAge: (waId: string) => {
			const v = ageByWaId.get((waId || "").trim());
			return typeof v === "number" && Number.isFinite(v) && v >= 10 && v <= 120;
		},
		setAge: (waId: string, age: number | null) => {
			const key = (waId || "").trim();
			if (!key) return;
			ageByWaId.set(key, age);
			try {
				const evt = new CustomEvent("customers:ageUpdated", {
					detail: { wa_id: key, hasAge: reg.hasAge(key) },
				});
				window.dispatchEvent(evt);
			} catch {}
			// Persist for next initial load
			try {
				const out: Record<string, number | null> = {};
				for (const [k, v] of ageByWaId.entries()) out[k] = v;
				sessionStorage.setItem("customerAges", JSON.stringify(out));
			} catch {}
		},
	};
	globalThis.__customerAgeRegistry = reg;
	return reg;
}

/**
 * Hook: Request and track customer ages for all waIds present in the calendar.
 * - Uses WebSocket (no extra HTTP GETs) to fetch profiles.
 * - Reacts live to `documents:customerProfile` broadcasts.
 * - Exposes registry on globalThis for lightweight DOM-based integrations.
 */
export function useCalendarCustomerAges(
	reservationsByUser: Record<string, Reservation[]>,
): void {
	const registryRef = useRef<AgeRegistry>(getOrInitRegistry());

	// Compute waIds present in the calendar
	const waIds = useMemo<string[]>(() => {
		return Object.keys(reservationsByUser || {}).map((k) => (k || "").trim());
	}, [reservationsByUser]);

	// Listen for WS profile fan-outs and update registry
	useEffect(() => {
		const onProfile = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| { wa_id?: string; waId?: string; age?: number | null }
					| undefined;
				const waId = String(detail?.wa_id || detail?.waId || "").trim();
				if (!waId) return;
				const raw = detail?.age as unknown;
				const n = Number(raw);
				const age = Number.isFinite(n) && n >= 10 && n <= 120 ? n : null;
				registryRef.current.setAge(waId, age);
			} catch {}
		};
		window.addEventListener(
			"documents:customerProfile",
			onProfile as EventListener,
		);
		return () =>
			window.removeEventListener(
				"documents:customerProfile",
				onProfile as EventListener,
			);
	}, []);

	// On waIds change, request any missing customer profiles over WS (no HTTP fallback here)
	useEffect(() => {
		if (!Array.isArray(waIds) || waIds.length === 0) return;
		try {
			const wsRef = (
				globalThis as unknown as {
					__wsConnection?: { current?: WebSocket };
				}
			).__wsConnection;
			const ws = wsRef?.current;
			if (!ws || ws.readyState !== WebSocket.OPEN) return;

			for (const waId of waIds) {
				const key = (waId || "").trim();
				if (!key) continue;
				// Skip if we already know the age state
				if (registryRef.current.ageByWaId.has(key)) continue;
				try {
					ws.send(
						JSON.stringify({ type: "get_customer", data: { wa_id: key } }),
					);
				} catch {}
			}
		} catch {}
	}, [waIds]);
}
