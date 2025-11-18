import type { ReactNode } from 'react'

// Core CSS (themes, base, tailwind) - needed everywhere
import '../globals.css'

// Calendar CSS - only for calendar routes (FullCalendar, events, etc.)
import '../../styles/calendar.css'

// Wheel picker - used in calendar for time selection
import '@ncdai/react-wheel-picker/style.css'

/**
 * Layout for core app routes (calendar, home, dashboard).
 * Loads: Core CSS + Calendar CSS + Wheel Picker
 */
export default function CoreLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
