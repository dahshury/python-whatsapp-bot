'use client'

import { Phone, Plus } from 'lucide-react'
import { CommandItem } from '@/shared/ui/command'

type CreatePhoneShortcutProps = {
	showCreateShortcut: boolean
	previewDisplay: string
	previewFallback: string
	addInlineTitle: string
	addInlineHint: string
	search: string
	onCreateNew: (raw: string) => void
}

export function CreatePhoneShortcut({
	showCreateShortcut,
	previewDisplay,
	previewFallback,
	addInlineTitle,
	addInlineHint,
	search,
	onCreateNew,
}: CreatePhoneShortcutProps) {
	if (!showCreateShortcut) {
		return null
	}

	return (
		<div className="p-2">
			<CommandItem
				className="items-start gap-3 rounded-lg border border-primary/30 border-dashed bg-background/60 px-3 py-3 text-left"
				onSelect={() => onCreateNew(search)}
				value="create-new"
			>
				<div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Phone className="size-4" />
				</div>
				<div className="flex flex-1 flex-col gap-1">
					<span className="font-medium text-sm">{addInlineTitle}</span>
					<span className="truncate text-muted-foreground text-xs">
						{previewDisplay || previewFallback}
					</span>
					<span className="text-muted-foreground text-xs">{addInlineHint}</span>
				</div>
				<Plus className="size-4 text-primary" />
			</CommandItem>
		</div>
	)
}
