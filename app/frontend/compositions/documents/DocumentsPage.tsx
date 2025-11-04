'use cache'

import { Suspense } from 'react'
import { DocumentsSection } from '@/widgets/documents/documents-section'

const ensureCacheBoundary = () => Promise.resolve()

export async function DocumentsPage() {
	await ensureCacheBoundary()
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DocumentsSection />
		</Suspense>
	)
}
