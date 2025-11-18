import { i18n } from '@shared/libs/i18n'

export function usePhoneSelectorMessages(
	isLocalized: boolean,
	addPreviewDisplay: string,
	search: string
) {
	const previewDisplay = addPreviewDisplay || search.trim()
	const previewFallback =
		i18n.getMessage('phone_add_number_placeholder', isLocalized) ||
		'Enter a phone number'
	const addNewTitle =
		i18n.getMessage('phone_add_new_title', isLocalized) ||
		'Add new phone number'
	const addNewDescription =
		i18n.getMessage('phone_add_new_description', isLocalized) ||
		'We could not find this phone number. Create it to track future conversations.'
	const addInlineTitle =
		i18n.getMessage('phone_add_inline_title', isLocalized) ||
		'Add this phone number'
	const addInlineHint =
		i18n.getMessage('phone_add_inline_hint', isLocalized) ||
		'Save it as a reusable contact.'
	const addButtonLabel =
		i18n.getMessage('phone_add_button', isLocalized) || 'Add'

	const recentHeading =
		i18n.getMessage('phone_group_recent', isLocalized) || 'Recent'
	const allHeading = i18n.getMessage('phone_group_all', isLocalized) || 'All'
	const selectedHeading =
		i18n.getMessage('phone_group_selected', isLocalized) || 'Selected'
	const favoritesHeading =
		i18n.getMessage('phone_group_favorites', isLocalized) || 'Favorites'

	return {
		previewDisplay,
		previewFallback,
		addNewTitle,
		addNewDescription,
		addInlineTitle,
		addInlineHint,
		addButtonLabel,
		recentHeading,
		allHeading,
		selectedHeading,
		favoritesHeading,
	}
}
