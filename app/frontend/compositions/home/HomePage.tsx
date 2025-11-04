'use cache'

import { HomeCalendar } from '@/widgets/calendar'

const ensureCacheBoundary = () => Promise.resolve()

export async function HomePage() {
	await ensureCacheBoundary()
	return <HomeCalendar />
}
