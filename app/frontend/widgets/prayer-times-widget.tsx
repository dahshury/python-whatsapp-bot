"use client";

import { useEffect, useRef } from "react";

export function PrayerTimesWidget() {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		// The prayer times widget will be embedded here
		if (iframeRef.current) {
			iframeRef.current.src = "https://offline.tawkit.net/";
		}
	}, []);

	return (
		<div className="prayer-times-widget w-full aspect-[16/10]">
			<iframe ref={iframeRef} title="Prayer Times" className="w-full h-full border-0 rounded-md" loading="lazy" />
		</div>
	);
}
