'use cache'

import type { ReactNode } from 'react'
import { ConditionalAppSidebar } from '@/features/navigation/conditional-app-sidebar'
import { PersistentDockHeader } from '@/features/navigation/persistent-dock-header'
import { AppProvidersClient } from './providers.client'

type AppProvidersProps = {
	children: ReactNode
}

const ensureCacheBoundary = () => Promise.resolve()

export async function AppProviders({ children }: AppProvidersProps) {
	await ensureCacheBoundary()
	return (
		<AppProvidersClient
			headerSlot={<PersistentDockHeader />}
			sidebarSlot={<ConditionalAppSidebar />}
		>
			{children}
		</AppProvidersClient>
	)
}
