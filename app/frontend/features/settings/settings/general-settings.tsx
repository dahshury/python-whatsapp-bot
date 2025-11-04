'use client'

import { i18n } from '@shared/libs/i18n'
import { useLanguage } from '@shared/libs/state/language-context'
import { toastService } from '@shared/libs/toast'
import { Label } from '@ui/label'
import { Languages } from 'lucide-react'
import { Switch } from '@/shared/ui/switch'

type GeneralSettingsProps = {
	isLocalized?: boolean
}

export function GeneralSettings({ isLocalized = false }: GeneralSettingsProps) {
	const { isLocalized: currentIsLocalized, setUseLocalizedText } = useLanguage()

	const handleLanguageToggle = (checked: boolean) => {
		setUseLocalizedText(checked)
		toastService.success(
			checked
				? i18n.getMessage('language_switched_to_arabic', true)
				: 'Switched to English'
		)
	}

	return (
		<div className="space-y-4">
			{/* Language Setting */}
			<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 font-medium text-sm">
						<Languages className="h-4 w-4" />
						{i18n.getMessage('language_label', isLocalized)}
					</Label>
					<p className="text-muted-foreground text-xs">
						{i18n.getMessage('language_toggle_hint', isLocalized)}
					</p>
				</div>
				<Switch
					checked={currentIsLocalized}
					className="data-[state=checked]:bg-primary"
					onCheckedChange={handleLanguageToggle}
				/>
			</div>
		</div>
	)
}
