import type { Metadata, Viewport } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import { AppProviders } from '@/app/providers'

// Minimal root layout matching official template structure
// Heavy CSS and fonts are loaded conditionally in AppProviders for non-minimal routes

export const metadata: Metadata = {
	title: 'Reservation Manager | WhatsApp Bot Dashboard',
	description:
		'Comprehensive reservation management system with WhatsApp integration, calendar scheduling, and real-time customer communication',
	keywords: [
		'reservations',
		'calendar',
		'WhatsApp',
		'booking',
		'scheduling',
		'appointments',
	],
	authors: [{ name: 'Reservation Manager Team' }],
	icons: {
		icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
	},
	manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: 'cover',
	themeColor: '#2563eb',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body suppressHydrationWarning>
				<Suspense fallback={null}>
					<AppProviders>{children}</AppProviders>
				</Suspense>
			</body>
		</html>
	)
}
