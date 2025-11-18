'use client'

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import type { SaveStatus } from '@/features/documents/types/save-state.types'
import { useLanguageStore } from '@/infrastructure/store/app-store'
import { i18n } from '@/shared/libs/i18n'

export const DocumentSavingIndicator: FC<{
	status: SaveStatus
}> = ({ status }) => {
	const { isLocalized } = useLanguageStore()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const effectiveIsLocalized = mounted ? isLocalized : false

	switch (status?.status) {
		case 'loading':
			return (
				<div className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-1 text-foreground text-xs shadow-sm">
					<Loader2 className="size-3 animate-spin" />
					<span>{i18n.getMessage('loading', effectiveIsLocalized)}</span>
				</div>
			)
		case 'saving':
			return (
				<div className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-1 text-blue-600 text-xs dark:text-blue-400">
					<Loader2 className="size-3 animate-spin" />
					<span>{i18n.getMessage('saving', effectiveIsLocalized)}</span>
				</div>
			)
		case 'dirty':
			return (
				<div className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-1 text-amber-600 text-xs dark:text-amber-400">
					<span>
						{i18n.getMessage('unsaved_changes', effectiveIsLocalized)}
					</span>
				</div>
			)
		case 'saved': {
			const t = new Date(status.at)
			const hh = `${t.getHours()}`.padStart(2, '0')
			const mm = `${t.getMinutes()}`.padStart(2, '0')
			const ss = `${t.getSeconds()}`.padStart(2, '0')
			const month = `${t.getMonth() + 1}`.padStart(2, '0')
			const day = `${t.getDate()}`.padStart(2, '0')
			const year = t.getFullYear()
			const savedLabel = i18n.getMessage('saved', effectiveIsLocalized)
			return (
				<div className="group pointer-events-auto inline-flex items-center overflow-hidden rounded-md bg-emerald-500/15 px-1.5 py-1 text-emerald-600 text-xs transition-all dark:text-emerald-400">
					<CheckCircle2 className="size-3 flex-shrink-0" />
					<span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover:ml-1 group-hover:max-w-[240px] group-hover:opacity-100">
						{savedLabel} {year}-{month}-{day} {hh}:{mm}:{ss}
					</span>
				</div>
			)
		}
		case 'error':
			return (
				<div className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-red-600 text-xs dark:text-red-400">
					<AlertCircle className="size-3" />
					<span>
						{status.message || i18n.getMessage('error', effectiveIsLocalized)}
					</span>
				</div>
			)
		case 'ready':
			return (
				<div className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card/90 px-2 py-1 text-muted-foreground text-xs shadow-sm backdrop-blur">
					<div className="size-3 rounded-full border-2 border-current" />
					<span>{i18n.getMessage('ready', effectiveIsLocalized)}</span>
				</div>
			)
		default:
			return null
	}
}
