'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr: false - prevents server-side rendering overhead
// This is CRITICAL for performance with browser-dependent libraries like tldraw
const Tldraw = dynamic(async () => (await import('tldraw')).Tldraw, {
	ssr: false,
})

export default function TldrawPage() {
	return (
		<main>
			<div style={{ position: 'fixed', inset: 0 }}>
				<Tldraw />
			</div>
		</main>
	)
}
