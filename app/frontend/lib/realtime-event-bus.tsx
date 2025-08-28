"use client";

import * as React from "react";
import { isLocalOperation } from "@/lib/realtime-utils";

export const RealtimeEventBus: React.FC = () => {
	React.useEffect(() => {
		const handler = (message: any) => {
			try {
				const { type, data } = message?.detail || {};
				if (!type || !data) return;

				const local = isLocalOperation(type, data);
				// Dispatch the notification capture event with local hint
				try {
					const notif = new CustomEvent("notification:add", {
						detail: { type, data, ts: Date.now(), __local: local },
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
