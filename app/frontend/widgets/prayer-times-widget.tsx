'use client'

import { useEffect, useRef } from 'react'

export function PrayerTimesWidget() {
	const iframeRef = useRef<HTMLIFrameElement>(null)

	useEffect(() => {
		// The prayer times widget will be embedded here
		if (iframeRef.current) {
			iframeRef.current.src = 'https://offline.tawkit.net/'
		}
	}, [])

	return (
		<div className="prayer-times-widget aspect-[16/10] w-full">
			<iframe
				className="h-full w-full rounded-md border-0"
				loading="lazy"
				ref={iframeRef}
				title="Prayer Times"
			/>
		</div>
	)
}
