"use client"

import { useEffect, useRef } from "react"

export function PrayerTimesWidget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // The prayer times widget will be embedded here
    if (iframeRef.current) {
      iframeRef.current.src = "https://offline.tawkit.net/"
    }
  }, [])

  return (
    <div className="prayer-times-widget">
      <iframe ref={iframeRef} title="Prayer Times" className="w-full h-[396px] border-0 rounded-md" loading="lazy" />
    </div>
  )
}
