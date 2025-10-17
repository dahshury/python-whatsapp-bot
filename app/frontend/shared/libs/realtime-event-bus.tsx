"use client";

import { logger } from "@shared/libs/logger";
import { isAllowedNotificationEvent } from "@shared/libs/notifications/utils";
import { type FC, useEffect } from "react";
import {
	isLocalOperation,
	type LocalOpData,
} from "@/shared/libs/realtime-utils";

type RealtimeMessage = {
	detail?: {
		type?: string;
		data?: LocalOpData;
	};
};

function parseTimestamp(message: RealtimeMessage): number {
	let tsNum = Date.now();
	try {
		const tsIso = (message?.detail as unknown as { timestamp?: string })
			?.timestamp;
		if (tsIso) {
			const parsed = Date.parse(String(tsIso));
			if (!Number.isNaN(parsed)) {
				tsNum = parsed;
			}
		}
	} catch {
		// Use current timestamp if parsing fails
	}
	return tsNum;
}

function dispatchNotificationEvent(
	type: string,
	data: LocalOpData,
	ts: number,
	isLocal: boolean
): void {
	try {
		const notif = new CustomEvent("notification:add", {
			detail: { type, data, ts, __local: isLocal },
		});
		window.dispatchEvent(notif);
	} catch {
		// Suppress dispatch errors
	}
}

function processRealtimeMessage(message: RealtimeMessage): void {
	const { type, data } = message?.detail || {};
	if (!(type && data)) {
		return;
	}

	try {
		logger.debug("🔔 [RealtimeEventBus] message", type, data);
	} catch {
		// Suppress debug logging errors
	}

	// Suppress anything not allowed by central policy
	try {
		if (!isAllowedNotificationEvent(type, data as Record<string, unknown>)) {
			return;
		}
	} catch {
		// Suppress policy check errors
	}

	const isLocal = isLocalOperation(type, data);
	const ts = parseTimestamp(message);
	dispatchNotificationEvent(type, data, ts, isLocal);
}

export const RealtimeEventBus: FC = () => {
	useEffect(() => {
		const handler = (message: RealtimeMessage) => {
			try {
				processRealtimeMessage(message);
			} catch {
				// Suppress outer try-catch errors
			}
		};

		// The ws hook already dispatches 'realtime' events internally after state updates.
		// Here we subscribe to those and mirror the notification flow, with dedupe and local detection.
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, []);

	return null;
};
