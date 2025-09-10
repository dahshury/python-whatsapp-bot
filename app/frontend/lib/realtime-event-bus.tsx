"use client";

import * as React from "react";
import { isLocalOperation, type LocalOpData } from "@/lib/realtime-utils";

interface RealtimeMessage {
	detail?: {
		type?: string;
		data?: LocalOpData;
	};
}

export const RealtimeEventBus: React.FC = () => {
	React.useEffect(() => {
		const handler = (message: RealtimeMessage) => {
			try {
				const { type, data } = message?.detail || {};
				if (!type || !data) return;

				// Suppress notification events for snapshots and ack/nack control messages
				try {
					const t = String(type).toLowerCase();
					if (t === "snapshot") return;
					if (t.endsWith("_ack") || t.endsWith("_nack")) return;
					if (t === "ack" || t === "nack") return;
				} catch {}

				const local = isLocalOperation(type, data);

				// Prefer server-provided timestamp for dedupe with persisted history
				let tsNum = Date.now();
				try {
					const tsIso = (message?.detail as unknown as { timestamp?: string })
						?.timestamp;
					if (tsIso) {
						const parsed = Date.parse(String(tsIso));
						if (!Number.isNaN(parsed)) tsNum = parsed;
					}
				} catch {}
				// Dispatch the notification capture event with local hint
				try {
					const notif = new CustomEvent("notification:add", {
						detail: { type, data, ts: tsNum, __local: local },
					});
					window.dispatchEvent(notif);
				} catch {}
			} catch {}
		};

		// The ws hook already dispatches 'realtime' events internally after state updates.
		// Here we subscribe to those and mirror the notification flow, with dedupe and local detection.
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, []);

	return null;
};
