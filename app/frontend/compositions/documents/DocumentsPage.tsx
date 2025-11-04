'use cache'

import { Suspense } from 'react'
import { registerPrefetchModules } from '@/shared/libs/prefetch/registry'
import { DocumentsSection } from '@/widgets/documents/documents-section'

export const preloadDocumentsSection = async () =>
	import('@/widgets/documents/documents-section').then(
		(mod) => mod.DocumentsSection
	)

export const preloadDocumentCanvas = async () =>
	import('@/widgets/document-canvas/DocumentCanvas').then(
		(mod) => mod.DocumentCanvas
	)

export const preloadDataGrid = async () =>
	import('@/shared/libs/data-grid/components/Grid')

export const preloadExcalidraw = async () =>
	import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw)

export const preloadCalendarDrawer = async () =>
	import('@/widgets/calendar/CalendarDrawer').then((mod) => mod.CalendarDrawer)

registerPrefetchModules('/documents', preloadDocumentsSection)
registerPrefetchModules('/documents', preloadDocumentCanvas)
registerPrefetchModules('/documents', preloadDataGrid)
registerPrefetchModules('/documents', preloadExcalidraw)
registerPrefetchModules('/documents', preloadCalendarDrawer)

const ensureCacheBoundary = () => Promise.resolve()

export async function DocumentsPage() {
	await ensureCacheBoundary()
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DocumentsSection />
		</Suspense>
	)
}
