/**
 * Utilities for converting app config columns to IColumnDefinition format.
 */

import { i18n } from '@shared/libs/i18n'
import type { ColumnConfig } from '@shared/services/config-service'
import type { IColumnDefinition } from '../components/core/interfaces/IDataSource'
import { ColumnDataType } from '../components/core/interfaces/IDataSource'

/**
 * Column config that can be in either snake_case (from API) or camelCase (from snapshot) format.
 */
type FlexibleColumnConfig =
	| ColumnConfig
	| {
			id: string
			name: string
			title: string
			dataType?: string
			data_type?: string
			isEditable?: boolean
			is_editable?: boolean
			isRequired?: boolean
			is_required?: boolean
			width?: number | null
			metadata?: Record<string, unknown> | null
	  }

/**
 * Convert app config column to IColumnDefinition.
 * Handles both snake_case (data_type, is_editable, is_required) and camelCase (dataType, isEditable, isRequired) formats.
 */
export function configColumnToIColumnDefinition(
	configColumn: FlexibleColumnConfig,
	isLocalized: boolean
): IColumnDefinition {
	// Handle both snake_case and camelCase formats
	const dataTypeValue =
		(configColumn as { dataType?: string }).dataType ??
		(configColumn as { data_type?: string }).data_type

	// Map data_type/dataType string to ColumnDataType enum
	// Handle missing or invalid data_type by defaulting to TEXT
	const dataTypeStr = dataTypeValue?.toLowerCase() ?? 'text'
	let dataType: ColumnDataType
	switch (dataTypeStr) {
		case 'text':
			dataType = ColumnDataType.TEXT
			break
		case 'number':
			dataType = ColumnDataType.NUMBER
			break
		case 'datetime':
			dataType = ColumnDataType.DATETIME
			break
		case 'phone':
			dataType = ColumnDataType.PHONE
			break
		case 'dropdown':
			dataType = ColumnDataType.DROPDOWN
			break
		case 'date':
			dataType = ColumnDataType.DATE
			break
		case 'time':
			dataType = ColumnDataType.TIME
			break
		default:
			dataType = ColumnDataType.TEXT
	}

	// Translate title: prefer metadata translations, fallback to i18n system
	let title = configColumn.title

	// First check if there are custom translations in metadata
	const metadata = configColumn.metadata as
		| Record<string, unknown>
		| null
		| undefined
	const translations =
		(metadata?.translations as Record<string, string> | undefined) || {}
	const lang = isLocalized ? 'ar' : 'en'

	if (translations[lang] && translations[lang].trim() !== '') {
		// Use custom translation from metadata
		title = translations[lang]
	} else if (
		configColumn.title.startsWith('field_') ||
		configColumn.title.startsWith('appt_') ||
		configColumn.title.startsWith('msg_')
	) {
		// Fallback to i18n system for predefined keys
		const i18nTranslation = i18n.getMessage(configColumn.title, isLocalized)
		// Only use if translation exists (different from key)
		if (i18nTranslation && i18nTranslation !== configColumn.title) {
			title = i18nTranslation
		}
	}

	// Handle dropdown options translation
	// Note: metadata is already defined above for translations check
	let processedMetadata = metadata
	if (
		dataType === ColumnDataType.DROPDOWN &&
		processedMetadata?.options &&
		Array.isArray(processedMetadata.options)
	) {
		const translatedOptions = processedMetadata.options.map((opt: unknown) => {
			const optStr = String(opt)
			if (
				optStr.startsWith('appt_') ||
				optStr.startsWith('field_') ||
				optStr.startsWith('msg_')
			) {
				return i18n.getMessage(optStr, isLocalized)
			}
			return optStr
		})
		processedMetadata = { ...processedMetadata, options: translatedOptions }
	}

	// Handle both snake_case and camelCase formats for boolean fields
	const isEditable =
		(configColumn as { isEditable?: boolean }).isEditable ??
		(configColumn as { is_editable?: boolean }).is_editable ??
		true
	const isRequired =
		(configColumn as { isRequired?: boolean }).isRequired ??
		(configColumn as { is_required?: boolean }).is_required ??
		false

	const result: IColumnDefinition = {
		id: configColumn.id,
		name: configColumn.name,
		title,
		dataType,
		isEditable,
		isRequired,
	}

	// Only include width if it's defined (exactOptionalPropertyTypes compatibility)
	if (configColumn.width !== null && configColumn.width !== undefined) {
		result.width = configColumn.width
	}

	// Only include metadata if it's defined (exactOptionalPropertyTypes compatibility)
	if (processedMetadata !== null && processedMetadata !== undefined) {
		result.metadata = processedMetadata
	}

	return result
}

/**
 * Convert array of app config columns to IColumnDefinition array.
 */
export function configColumnsToIColumnDefinitions(
	configColumns: FlexibleColumnConfig[],
	isLocalized: boolean
): IColumnDefinition[] {
	return configColumns.map((col) =>
		configColumnToIColumnDefinition(col, isLocalized)
	)
}
