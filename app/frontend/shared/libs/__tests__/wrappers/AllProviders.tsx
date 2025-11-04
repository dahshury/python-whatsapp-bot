import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { LanguageProvider } from '@/shared/libs/state/language-context'

const AllProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
	const clientRef = React.useRef<QueryClient>()
	if (!clientRef.current) {
		clientRef.current = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
	}
	return (
		<QueryClientProvider client={clientRef.current}>
			<LanguageProvider>{children}</LanguageProvider>
		</QueryClientProvider>
	)
}

export default AllProviders
