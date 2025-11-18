import type { ReactNode } from 'react'

// Minimal globals - only essential styles for documents page
import './globals.css'

// Minimal documents CSS - only tldraw, data grid, list view calendar, drawer
import '../../styles/documents-minimal.css'

// Wheel picker CSS - needed for age cell in documents grid
import '@ncdai/react-wheel-picker/style.css'

/**
 * Layout for documents routes.
 * Loads: Minimal CSS optimized for documents page performance
 * - tldraw canvas CSS and containers, status indicator
 * - glide data grid CSS
 * - drawer with calendar list view ONLY
 * - header with icons and dock
 */
export default function DocumentsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
